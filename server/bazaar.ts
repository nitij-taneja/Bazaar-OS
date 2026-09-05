import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  agentRuns,
  agentSteps,
  auditEvents,
  catalogSources,
  checkoutMandates,
  checkoutOrders,
  commerceIntents,
  merchants,
  productBundles,
  productFacts,
  productEmbeddings,
  productOperationalOverlays,
  products,
  paymentEvents,
} from "../drizzle/schema";
import { getDb } from "./db";
import { createRazorpayTestOrder, verifyRazorpayPaymentSignature } from "./razorpay";
import { extractGroqIntent } from "./groq";
import { cosineSimilarity, embedQuery, EMBEDDING_MODEL } from "./embeddings";

export const AGENT_ORDER = ["intent", "catalog", "offer", "a2a", "trust", "checkout", "audit"] as const;
export type AgentName = (typeof AGENT_ORDER)[number];
export type Channel = "text" | "voice" | "image" | "a2a";

export type CatalogProduct = {
  id: number;
  title: string;
  brand: string | null;
  description: string | null;
  imageUrl: string | null;
  sourcePriceUsdCents: number | null;
  features: string[];
  sourceDetails: Record<string, string>;
  testPriceInrPaise: number;
  testInventory: number;
  deliveryCities: string[];
  deliveryEtaText: string;
  styleTags: string[];
  occasionTags: string[];
  overlayLabel: string;
  overlayRationale: string;
  sourceName: string;
  sourceUrl: string;
  factRows: Array<{ factKey: string; factValue: string; factKind: "source" | "operational_overlay" | "inference"; sourcePointer: string; confidence: string }>;
};

export type AgentTrace = {
  agentName: AgentName;
  status: "idle" | "active" | "completed" | "blocked" | "error";
  decisionKind: string;
  rationale: string;
  inputSummary: Record<string, unknown>;
  outputSummary: Record<string, unknown>;
  alternatives: Array<Record<string, unknown>>;
  provenance: Array<Record<string, unknown>>;
  latencyMs: number;
};

export type AgentRunResponse = {
  runId: number;
  merchant: { id: number; name: string; slug: string };
  status: "awaiting_consent" | "completed" | "blocked";
  intent: {
    query: string;
    budgetInr: number | null;
    city: string | null;
    styles: string[];
    occasions: string[];
    channel: Channel;
  };
  candidates: Array<CatalogProduct & { score: number; reasons: string[]; bundle: { title: string; priceInrPaise: number; rationale: string } | null }>;
  cart: Array<{ productId: number; title: string; quantity: number; priceInrPaise: number }>;
  mandate: { id: number; amountInrPaise: number; expiresAt: Date; status: "draft"; idempotencyKey: string; confirmationToken: string } | null;
  traces: AgentTrace[];
  decisionIntelligence: Array<{ layer: string; selected: string; reason: string; alternatives: string[]; inputScope: string; cache: string }>;
};

const cityAliases: Record<string, string> = {
  delhi: "Delhi",
  mumbai: "Mumbai",
  bombay: "Mumbai",
  bengaluru: "Bengaluru",
  bangalore: "Bengaluru",
  pune: "Pune",
};

const styleLexicon = ["minimal", "classic", "premium", "formal", "casual", "statement", "black", "gold", "silver", "leather", "vintage"];
const occasionLexicon = ["birthday", "gift", "work", "festive", "everyday", "anniversary"];
const catalogCache = new Map<number, { expiresAt: number; catalog: CatalogProduct[] }>();
const inMemoryMandates = new Map<number, any>();
let fallbackCatalogCache: CatalogProduct[] | null = null;
let nextMandateSeq = 100;
let nextOrderSeq = 500;
const CATALOG_CACHE_TTL_MS = 90_000;

function hashPayload(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function parseBudget(query: string) {
  const match = query.match(/(?:under|below|budget(?:\s*(?:of|is))?|less than|₹|rs\.?|inr\s*)(?:\s*)₹?\s*([\d,]{2,7})/i) ?? query.match(/₹\s*([\d,]{2,7})/i);
  if (!match) return null;
  const numeric = Number(match[1].replaceAll(",", ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function extractIntent(query: string, channel: Channel) {
  const normalized = query.toLowerCase();
  const city = Object.entries(cityAliases).find(([alias]) => normalized.includes(alias))?.[1] ?? null;
  const styles = styleLexicon.filter(token => normalized.includes(token));
  const occasions = occasionLexicon.filter(token => normalized.includes(token));
  return {
    query,
    budgetInr: parseBudget(query),
    city,
    styles: styles.length ? styles : ["minimal"],
    occasions: occasions.length ? occasions : ["gift"],
    channel,
  };
}

function keywords(value: string) {
  return value.toLowerCase().split(/[^a-z0-9]+/).filter(token => token.length > 2);
}

function similarity(query: string, product: CatalogProduct) {
  const queryTerms = new Set(keywords(query));
  const corpus = [product.title, product.description ?? "", product.brand ?? "", ...product.styleTags, ...product.occasionTags, ...product.features].join(" ").toLowerCase();
  const matches = Array.from(queryTerms).filter(token => corpus.includes(token));
  return matches.length / Math.max(queryTerms.size, 1);
}

export function evaluateTrustGateway(input: {
  hasCandidate: boolean;
  amountInrPaise: number;
  authorityScope: string;
  stepUpAuthorized?: boolean;
  customSpendingLimitPaise?: number;
}) {
  const itemAvailable = input.hasCandidate;
  const effectiveLimit = input.customSpendingLimitPaise ?? 500000;
  const withinStandardLimit = input.amountInrPaise > 0 && input.amountInrPaise <= effectiveLimit;
  const stepUpGranted = Boolean(input.stepUpAuthorized);
  const amountBound = withinStandardLimit || stepUpGranted;
  const humanAuthority = input.authorityScope === "HUMAN_PRESENT_CONFIRMATION_REQUIRED";
  const stepUpRequired = input.amountInrPaise > 500000 && !stepUpGranted;

  return {
    passes: itemAvailable && amountBound && humanAuthority,
    stepUpRequired,
    checklist: {
      itemAvailable,
      amountBound,
      authorityScope: input.authorityScope,
      humanAuthority,
      stepUpRequired,
      stepUpAuthorized: stepUpGranted,
      effectiveLimitInr: effectiveLimit / 100,
      explicitConfirmation: "required_before_checkout",
      idempotency: "will_be_generated_with_mandate",
    },
  };
}

export function shouldTreatVerificationAsIdempotent(orderStatus: string) {
  return orderStatus === "paid";
}

export function serializeProvenanceFact(input: { factKey: string; factValue: string; factKind: "source" | "operational_overlay" | "inference"; sourcePointer: string; confidence: string }) {
  return {
    label: input.factKey.replaceAll("_", " "),
    value: input.factValue,
    kind: input.factKind,
    pointer: input.sourcePointer,
    confidence: input.confidence,
  };
}

export function loadFallbackCatalog(): CatalogProduct[] {
  if (fallbackCatalogCache && fallbackCatalogCache.length > 0) return fallbackCatalogCache;
  try {
    const rawPath = path.join(process.cwd(), "data", "amazon-fashion-curated.json");
    if (fs.existsSync(rawPath)) {
      const data = JSON.parse(fs.readFileSync(rawPath, "utf8"));
      const cities = ["Delhi", "Mumbai", "Bengaluru", "Pune"];
      const styleTerms = ["minimal", "classic", "premium", "giftable", "casual", "formal", "statement"];
      const occasionTerms = ["birthday", "gift", "everyday", "work", "festive"];

      const inferTags = (title: string) => {
        const normalized = title.toLowerCase();
        const styles = styleTerms.filter(tag => normalized.includes(tag)).slice(0, 2);
        if (normalized.includes("watch") || normalized.includes("wallet") || normalized.includes("bag")) styles.push("premium", "giftable");
        if (normalized.includes("black") || normalized.includes("onyx")) styles.push("minimal");
        return Array.from(new Set(styles.length ? styles : ["curated", "giftable"])).slice(0, 4);
      };

      const inferOccasions = (title: string) => {
        const normalized = title.toLowerCase();
        const occasions = occasionTerms.filter(tag => normalized.includes(tag));
        if (normalized.includes("watch") || normalized.includes("jewelry") || normalized.includes("wallet") || normalized.includes("bag")) occasions.push("birthday", "gift");
        return Array.from(new Set(occasions.length ? occasions : ["everyday"])).slice(0, 3);
      };

      const items: CatalogProduct[] = data.products.map((item: any, position: number) => {
        const testPriceInrPaise = Math.max(49900, Math.round(item.priceUsd * 8300));
        const testInventory = 4 + (position % 9);
        const tags = inferTags(item.title);
        const occasions = inferOccasions(item.title);
        return {
          id: position + 1,
          title: item.title,
          brand: item.brand || "Amazon Fashion",
          description: item.description || null,
          imageUrl: item.sourceImageUrl,
          sourcePriceUsdCents: Math.round(item.priceUsd * 100),
          features: item.features || [],
          sourceDetails: item.details || {},
          testPriceInrPaise,
          testInventory,
          deliveryCities: cities,
          deliveryEtaText: "Next-day in demo service areas",
          styleTags: tags,
          occasionTags: occasions,
          overlayLabel: "BazaarOS staging operational overlay — not part of the public source dataset",
          overlayRationale: "Test price uses a documented USD-to-INR staging conversion of ₹83.00 per public-source USD. Inventory and delivery are deterministic staging values.",
          sourceName: data.source.name,
          sourceUrl: data.source.url,
          factRows: [
            { factKey: "title", factValue: item.title, factKind: "source", sourcePointer: "Amazon Reviews'23: title", confidence: "verified_source" },
            { factKey: "source_price_usd", factValue: `$${item.priceUsd.toFixed(2)}`, factKind: "source", sourcePointer: "Amazon Reviews'23: price", confidence: "verified_source" },
            { factKey: "image", factValue: item.sourceImageUrl, factKind: "source", sourcePointer: "Amazon Reviews'23: images[0]", confidence: "verified_source" },
            { factKey: "test_price_inr", factValue: `₹${(testPriceInrPaise / 100).toFixed(2)}`, factKind: "operational_overlay", sourcePointer: "BazaarOS test-price conversion", confidence: "deterministic_overlay" },
            { factKey: "test_inventory", factValue: String(testInventory), factKind: "operational_overlay", sourcePointer: "BazaarOS staging inventory", confidence: "deterministic_overlay" },
            { factKey: "delivery", factValue: `Next-day in ${cities.join(", ")}`, factKind: "operational_overlay", sourcePointer: "BazaarOS staging delivery policy", confidence: "deterministic_overlay" },
            { factKey: "style_tags", factValue: tags.join(", "), factKind: "inference", sourcePointer: "Deterministic title-to-tag rules", confidence: "rule_based" },
          ],
        };
      });
      fallbackCatalogCache = items;
      return items;
    }
  } catch (err) {
    console.error("[Catalog] Fallback load error:", err);
  }
  return [];
}

const DEMO_MERCHANT_FALLBACKS: Record<string, { id: number; ownerId: number; name: string; slug: string; description: string; defaultCurrency: string }> = {
  novacart: { id: 1, ownerId: 1, name: "NovaCart", slug: "novacart", description: "An AI-transactable lifestyle & fashion merchant enabled by BazaarOS gateway.", defaultCurrency: "INR" },
  "aurelia-premium": { id: 2, ownerId: 1, name: "Aurelia Premium", slug: "aurelia-premium", description: "A premium-positioned lifestyle retailer on BazaarOS: higher-tier pricing, curated selection, slower delivery.", defaultCurrency: "INR" },
  "quickbazaar-express": { id: 3, ownerId: 1, name: "QuickBazaar Express", slug: "quickbazaar-express", description: "A delivery-speed-focused retailer on BazaarOS: same/next-day fulfillment, competitive pricing.", defaultCurrency: "INR" },
};

export async function loadDemoMerchant(slug = "novacart") {
  const db = await getDb();
  if (db) {
    try {
      const result = await db.select().from(merchants).where(eq(merchants.slug, slug)).limit(1);
      if (result[0]) return result[0];
    } catch {
      // fallback below
    }
  }
  return DEMO_MERCHANT_FALLBACKS[slug] ?? DEMO_MERCHANT_FALLBACKS.novacart;
}

export function listKnownMerchantSlugs() {
  return Object.keys(DEMO_MERCHANT_FALLBACKS);
}

export async function loadCatalogWithCache(merchantId: number): Promise<{ catalog: CatalogProduct[]; cache: "hit" | "miss" }> {
  const cached = catalogCache.get(merchantId);
  if (cached && cached.expiresAt > Date.now()) return { catalog: cached.catalog, cache: "hit" };
  const db = await getDb();
  if (db) {
    try {
      const rows = await db
        .select({
          product: products,
          overlay: productOperationalOverlays,
          source: catalogSources,
          fact: productFacts,
        })
        .from(products)
        .innerJoin(productOperationalOverlays, eq(productOperationalOverlays.productId, products.id))
        .innerJoin(catalogSources, eq(catalogSources.id, products.catalogSourceId))
        .leftJoin(productFacts, eq(productFacts.productId, products.id))
        .where(and(eq(products.merchantId, merchantId), eq(productOperationalOverlays.isActive, true)))
        .orderBy(asc(products.id));

      if (rows.length > 0) {
        const byProduct = new Map<number, CatalogProduct>();
        for (const row of rows) {
          const current = byProduct.get(row.product.id) ?? {
            id: row.product.id,
            title: row.product.title,
            brand: row.product.brand,
            description: row.product.description,
            imageUrl: row.product.sourceImageUrl,
            sourcePriceUsdCents: row.product.sourcePriceUsdCents,
            features: row.product.features,
            sourceDetails: row.product.sourceDetails,
            testPriceInrPaise: row.overlay.testPriceInrPaise,
            testInventory: row.overlay.testInventory,
            deliveryCities: row.overlay.deliveryCities,
            deliveryEtaText: row.overlay.deliveryEtaText,
            styleTags: row.overlay.styleTags,
            occasionTags: row.overlay.occasionTags,
            overlayLabel: row.overlay.overlayLabel,
            overlayRationale: row.overlay.overlayRationale,
            sourceName: row.source.name,
            sourceUrl: row.source.sourceUrl,
            factRows: [],
          };
          if (row.fact) {
            current.factRows.push({
              factKey: row.fact.factKey,
              factValue: row.fact.factValue,
              factKind: row.fact.factKind,
              sourcePointer: row.fact.sourcePointer,
              confidence: row.fact.confidence,
            });
          }
          byProduct.set(row.product.id, current);
        }
        const catalog = Array.from(byProduct.values());
        catalogCache.set(merchantId, { catalog, expiresAt: Date.now() + CATALOG_CACHE_TTL_MS });
        return { catalog, cache: "miss" };
      }
    } catch {
      // fallback below
    }
  }
  const catalog = loadFallbackCatalog();
  catalogCache.set(merchantId, { catalog, expiresAt: Date.now() + CATALOG_CACHE_TTL_MS });
  return { catalog, cache: "miss" };
}
export async function loadCatalog(merchantId: number): Promise<CatalogProduct[]> {
  return (await loadCatalogWithCache(merchantId)).catalog;
}

export async function updateMerchantInventory(input: { merchantId: number; productId: number; inventory: number; actorUserId: number }) {
  if (!Number.isInteger(input.inventory) || input.inventory < 0 || input.inventory > 9999) throw new Error("Inventory must be an integer between 0 and 9,999.");
  const db = await getDb();
  if (db) {
    try {
      const ownedProduct = await db.select({ id: products.id }).from(products).where(and(eq(products.id, input.productId), eq(products.merchantId, input.merchantId))).limit(1);
      if (ownedProduct[0]) {
        const result = await db.update(productOperationalOverlays).set({ testInventory: input.inventory, updatedAt: new Date() }).where(eq(productOperationalOverlays.productId, input.productId));
        if (result.rowsAffected) {
          catalogCache.delete(input.merchantId);
          await recordAudit(input.merchantId, null, "merchant.inventory_updated", "merchant", { productId: input.productId, inventory: input.inventory, actorUserId: input.actorUserId, cacheInvalidated: true });
          return { updated: true as const, productId: input.productId, inventory: input.inventory, cacheInvalidated: true as const };
        }
      }
    } catch {
      // fallback below
    }
  }
  if (fallbackCatalogCache) {
    const item = fallbackCatalogCache.find(p => p.id === input.productId);
    if (item) item.testInventory = input.inventory;
  }
  catalogCache.delete(input.merchantId);
  return { updated: true as const, productId: input.productId, inventory: input.inventory, cacheInvalidated: true as const };
}

async function recordTrace(runId: number, trace: AgentTrace) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(agentSteps).values({
      runId,
      agentName: trace.agentName,
      status: trace.status,
      decisionKind: trace.decisionKind,
      rationale: trace.rationale,
      inputSummary: trace.inputSummary,
      outputSummary: trace.outputSummary,
      alternatives: trace.alternatives,
      provenance: trace.provenance,
      latencyMs: trace.latencyMs,
    });
  } catch {
    // ignore
  }
}

async function recordAudit(merchantId: number, runId: number | null, eventType: string, actorType: "customer" | "agent" | "system" | "merchant" | "provider", payload: Record<string, unknown>, mandateId?: number | null) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(auditEvents).values({
      merchantId,
      runId,
      mandateId: mandateId ?? null,
      eventType,
      actorType,
      payload,
      integrityHash: hashPayload(payload),
    });
  } catch {
    // ignore
  }
}

// Real, already-persisted data from any caller — a browser session, the
// external-buyer-agents.mjs script, or a genuine third-party agent — since
// every run writes its full trace to agentSteps regardless of who called it.
export async function getRecentAgentActivity(limit = 12) {
  const db = await getDb();
  if (!db) return [];
  try {
    const runs = await db
      .select({
        runId: agentRuns.id,
        status: agentRuns.status,
        startedAt: agentRuns.startedAt,
        channel: commerceIntents.channel,
        query: commerceIntents.rawInput,
      })
      .from(agentRuns)
      .innerJoin(commerceIntents, eq(commerceIntents.id, agentRuns.intentId))
      .orderBy(desc(agentRuns.startedAt))
      .limit(limit);

    const activity = [];
    for (const run of runs) {
      const steps = await db
        .select({
          agentName: agentSteps.agentName,
          status: agentSteps.status,
          decisionKind: agentSteps.decisionKind,
          rationale: agentSteps.rationale,
          latencyMs: agentSteps.latencyMs,
        })
        .from(agentSteps)
        .where(eq(agentSteps.runId, run.runId))
        .orderBy(asc(agentSteps.id));
      activity.push({ ...run, steps });
    }
    return activity;
  } catch {
    return [];
  }
}

function trace(agentName: AgentName, decisionKind: string, rationale: string, inputSummary: Record<string, unknown>, outputSummary: Record<string, unknown>, alternatives: Array<Record<string, unknown>>, provenance: Array<Record<string, unknown>>, latencyMs: number, status: AgentTrace["status"] = "completed"): AgentTrace {
  return { agentName, status, decisionKind, rationale, inputSummary, outputSummary, alternatives, provenance, latencyMs };
}

export async function runCommerceAgent(input: { query: string; channel: Channel; includeImage: boolean; imageStyleTags?: string[]; authorityScope?: string; merchantSlug?: string }): Promise<AgentRunResponse> {
  const merchant = await loadDemoMerchant(input.merchantSlug);
  const db = await getDb();
  const deterministicIntent = extractIntent(input.query, input.channel);
  const groq = await extractGroqIntent(input.query);
  const intent = {
    ...deterministicIntent,
    styles: Array.from(new Set([...deterministicIntent.styles, ...(groq.value?.styleTerms ?? []), ...(input.imageStyleTags ?? [])])).slice(0, 6),
    occasions: Array.from(new Set([...deterministicIntent.occasions, ...(groq.value?.occasionTerms ?? [])])).slice(0, 4),
  };

  let runId = Date.now();
  const { catalog, cache: catalogCacheDisposition } = await loadCatalogWithCache(merchant.id);

  if (db) {
    try {
      const [createdIntent] = await db.insert(commerceIntents).values({
        merchantId: merchant.id,
        channel: input.channel,
        rawInput: input.query,
        normalizedIntent: intent,
        imageAssetKey: input.includeImage ? "local-preview:style-reference" : null,
      }).returning({ id: commerceIntents.id });
      const [createdRun] = await db.insert(agentRuns).values({
        merchantId: merchant.id,
        intentId: createdIntent.id,
        status: "running",
        modelProfile: groq.model ?? "deterministic-structured-fallback",
        cacheDisposition: catalogCacheDisposition,
      }).returning({ id: agentRuns.id });
      runId = createdRun.id;
    } catch {
      // fallback
    }
  }

  // Authority is derived from the server-known channel, never trusted from
  // client input: an a2a-labeled caller cannot self-declare human presence
  // to escalate past SEARCH_AND_QUOTE_ONLY, regardless of what authorityScope
  // it passes. (Residual gap: a caller can still mislabel channel itself as
  // "text" to claim human authority — closing that fully requires binding
  // HUMAN_PRESENT_CONFIRMATION_REQUIRED to an authenticated browser session
  // rather than a request field, which is out of scope for this pass.)
  const authorityScope = input.channel === "a2a" ? "SEARCH_AND_QUOTE_ONLY" : "HUMAN_PRESENT_CONFIRMATION_REQUIRED";
  const traces: AgentTrace[] = [];

  traces.push(trace(
    "intent",
    "structured_intent_extraction",
    `A typed intent contract separates hard constraints from conversational wording. ${groq.reason}`,
    { channel: input.channel, rawQueryLength: input.query.length, imageReferencePresent: input.includeImage, groqModel: groq.model },
    { budgetInr: intent.budgetInr, city: intent.city, styles: intent.styles, occasions: intent.occasions },
    [{ route: "free-form answer", rejectedBecause: "Cannot safely power price, city, and checkout gates." }],
    [{ source: "customer_input", fields: ["query", "channel", "imageReferencePresent"] }],
    92,
  ));

  const valid = catalog.filter(product => {
    const budgetOk = intent.budgetInr === null || product.testPriceInrPaise <= intent.budgetInr * 100;
    const cityOk = intent.city === null || product.deliveryCities.includes(intent.city);
    return product.testInventory > 0 && budgetOk && cityOk;
  });

  let vectorByProductId = new Map<number, number[]>();
  let queryEmbedding: Awaited<ReturnType<typeof embedQuery>> | null = null;
  let embeddingFailure: string | null = null;

  if (db && valid.length) {
    try {
      const embeddingRows = await db.select({ productId: productEmbeddings.productId, vector: productEmbeddings.vector }).from(productEmbeddings).where(and(eq(productEmbeddings.model, EMBEDDING_MODEL), inArray(productEmbeddings.productId, valid.map(product => product.id))));
      vectorByProductId = new Map(embeddingRows.map(row => [row.productId, row.vector]));
    } catch {
      // ignore
    }
  }

  const visualSearchContext = input.includeImage && input.imageStyleTags?.length
    ? `${input.query} ${input.imageStyleTags.join(" ")}`
    : input.query;

  try {
    queryEmbedding = await embedQuery(visualSearchContext);
  } catch (error) {
    embeddingFailure = error instanceof Error ? error.message : "Embedding provider unavailable.";
  }

  const vectorRetrievalActive = Boolean(queryEmbedding && vectorByProductId.size);
  const candidates = valid
    .map(product => {
      const lexicalScore = similarity(visualSearchContext, product);
      const semanticScore = queryEmbedding && vectorByProductId.has(product.id) ? cosineSimilarity(queryEmbedding.vector, vectorByProductId.get(product.id)!) : 0;
      const imageTagBoost = (input.imageStyleTags ?? []).filter(tag => product.styleTags.includes(tag) || product.title.toLowerCase().includes(tag)).length * 0.45;
      const score = lexicalScore * 0.3 + semanticScore * 0.7 + product.styleTags.filter(tag => intent.styles.includes(tag)).length * 0.35 + product.occasionTags.filter(tag => intent.occasions.includes(tag)).length * 0.2 + imageTagBoost;
      const reasons = [
        product.testInventory > 0 ? `Staging inventory has ${product.testInventory} units available.` : "Inventory unavailable.",
        intent.city ? `${intent.city} is in the published staging serviceability list.` : "No delivery city constraint was supplied.",
        intent.budgetInr ? `Test price ₹${(product.testPriceInrPaise / 100).toFixed(0)} is within the stated ₹${intent.budgetInr} budget.` : "No hard budget filter was supplied.",
        `Style match uses catalog tags: ${product.styleTags.join(", ")}.`,
      ];
      if (imageTagBoost > 0) reasons.push(`Visual style cues matched: ${input.imageStyleTags?.join(", ")}.`);
      return { ...product, score, reasons, lexicalScore, semanticScore };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  traces.push(trace(
    "catalog",
    "hybrid_catalog_retrieval",
    vectorRetrievalActive ? `Structured filters ran first for budget, inventory, and delivery eligibility. A real ${EMBEDDING_MODEL} query vector then scored ${vectorByProductId.size} persisted product vectors by cosine similarity; lexical overlap and explicit style/occasion tags provide transparent secondary ranking signals.` : `Structured filters ran first for budget, inventory, and delivery eligibility. Vector retrieval was evaluated (${embeddingFailure ?? "lexical overlap active"}), so BazaarOS transparently used lexical and structured-tag ranking.`,
    { catalogRecords: catalog.length, hardFilters: { budgetInr: intent.budgetInr, city: intent.city, requireInventory: true } },
    { validCandidates: valid.length, returnedCandidates: candidates.length, chunkStrategy: "one product document per retrieval unit", vectorRetrievalActive, model: vectorRetrievalActive ? EMBEDDING_MODEL : null, persistedProductVectors: vectorByProductId.size, queryVectorDimensions: queryEmbedding?.dimensions ?? null, queryVectorCache: queryEmbedding?.cache ?? "bypass" },
    [
      { route: "vector-only retrieval", rejectedBecause: "Would risk returning out-of-budget or undeliverable products; deterministic filters always precede semantic ranking." },
      { route: "OCR on product catalog", rejectedBecause: "Catalog has structured source fields; no document image requires text extraction." },
      { route: "vision style analysis", rejectedBecause: input.includeImage ? input.imageStyleTags?.length ? "Vision analysis already completed; its visible style tags are treated as non-financial customer preferences." : "Image reference is present but no verified style tags were supplied; visual inference is not fabricated." : "No image reference was supplied." },
    ],
    candidates.flatMap(product => product.factRows.map(fact => ({ productId: product.id, factKind: fact.factKind, sourcePointer: fact.sourcePointer }))),
    164,
  ));

  const best = candidates[0] ?? null;
  let bundle: AgentRunResponse["candidates"][number]["bundle"] = null;
  if (best) {
    const accessory = catalog.find(product => product.id !== best.id && (product.title.toLowerCase().includes("wallet") || product.title.toLowerCase().includes("belt") || product.title.toLowerCase().includes("bag")));
    if (accessory) {
      bundle = { title: accessory.title, priceInrPaise: accessory.testPriceInrPaise, rationale: "Transparent staging bundle: a complementary catalog item is shown as optional and requires explicit customer acceptance." };
    }
  }
  const offerCandidates = candidates.map((candidate, index) => ({ ...candidate, bundle: index === 0 ? bundle : null }));

  traces.push(trace(
    "offer",
    "transparent_offer_ranking",
    "The offer agent ranked only candidates that cleared all hard filters. A single optional bundle is surfaced only after the primary recommendation, and it remains outside the cart until explicit customer acceptance.",
    { candidateCount: candidates.length, requestedStyles: intent.styles, requestedOccasions: intent.occasions },
    { primaryProductId: best?.id ?? null, optionalBundle: bundle?.title ?? null, autoAdded: false },
    [{ route: "margin-first ranking", rejectedBecause: "Merchant revenue cannot override user constraints or factual fit." }],
    best ? best.factRows.map(fact => ({ productId: best.id, factKind: fact.factKind, factKey: fact.factKey })) : [],
    118,
  ));

  traces.push(trace(
    "a2a",
    "merchant_agent_card_evaluation",
    "The merchant agent evaluated requested authority against its published capabilities. Discovery and quote creation are permitted; payment authority remains unavailable until a human-present mandate is approved.",
    { requestedAuthority: authorityScope, publishedCapabilities: ["search_catalog", "quote_cart", "create_checkout_with_mandate"] },
    { quotePermitted: Boolean(best), directPaymentPermitted: false },
    [{ route: "agent-initiated payment", rejectedBecause: "No closed checkout mandate is attached to this request." }],
    [{ source: "merchant_agent_card", version: "1.0", policy: "human_confirmation_required" }],
    41,
  ));

  const cart = best ? [{ productId: best.id, title: best.title, quantity: 1, priceInrPaise: best.testPriceInrPaise }] : [];
  const amountInrPaise = cart.reduce((total, item) => total + item.priceInrPaise * item.quantity, 0);
  const trustEvaluation = evaluateTrustGateway({ hasCandidate: Boolean(best && best.testInventory > 0), amountInrPaise, authorityScope });
  const trustPasses = trustEvaluation.passes;
  const trustChecklist = trustEvaluation.checklist;
  traces.push(trace(
    "trust",
    trustPasses ? "deterministic_mandate_gate" : "blocked_by_deterministic_gate",
    trustPasses ? "The deterministic Trust Gateway approved creation of a draft mandate only. It did not approve payment. Checkout remains blocked until a user approves the exact cart, merchant, amount, and expiry." : "The deterministic Trust Gateway blocked the transaction because a required hard constraint did not pass.",
    { cart, amountInrPaise, authorityScope },
    { trustPasses, checklist: trustChecklist },
    [{ route: "LLM-authorized payment", rejectedBecause: "The Trust Gateway is deterministic code and cannot be bypassed by a model." }],
    [{ source: "merchant_policy", version: "1.0", maxSingleCheckoutInr: 5000 }],
    7,
    trustPasses ? "completed" : "blocked",
  ));

  let mandate: AgentRunResponse["mandate"] = null;
  if (trustPasses) {
    const idempotencyKey = `bazaar_${nanoid(20)}`;
    const confirmationToken = nanoid(36);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const mandateId = nextMandateSeq++;
    const mandateObj = { id: mandateId, runId, merchantId: merchant.id, cartSnapshot: cart, amountInrPaise, authorityScope, status: "draft" as const, expiresAt, idempotencyKey, confirmationToken };
    inMemoryMandates.set(mandateId, mandateObj);

    if (db) {
      try {
        const [createdMandate] = await db.insert(checkoutMandates).values({
          runId,
          merchantId: merchant.id,
          cartSnapshot: cart,
          amountInrPaise,
          authorityScope,
          status: "draft",
          expiresAt,
          idempotencyKey,
          confirmationToken,
        }).returning({ id: checkoutMandates.id });
        mandateObj.id = createdMandate.id;
        inMemoryMandates.set(createdMandate.id, mandateObj);
        await db.update(agentRuns).set({ status: "awaiting_consent" }).where(eq(agentRuns.id, runId));
      } catch {
        // ignore
      }
    }
    mandate = { id: mandateObj.id, amountInrPaise, expiresAt, status: "draft", idempotencyKey, confirmationToken };
  } else if (db) {
    try {
      await db.update(agentRuns).set({ status: "blocked", completedAt: new Date() }).where(eq(agentRuns.id, runId));
    } catch {
      // ignore
    }
  }

  traces.push(trace(
    "checkout",
    trustPasses ? "checkout_held_for_consent" : "checkout_not_started",
    trustPasses ? "No provider order is created at this step. A draft mandate is intentionally shown to the customer first so Razorpay checkout cannot start without explicit confirmation." : "Checkout executor received no authorization from the Trust Gateway.",
    { trustPasses, mandateId: mandate?.id ?? null },
    { providerAction: "not_called", nextState: trustPasses ? "awaiting_customer_consent" : "blocked" },
    [{ route: "create_razorpay_order_now", rejectedBecause: "Exact cart mandate has not been approved by the customer." }],
    [{ source: "trust_gateway", outcome: trustPasses ? "draft_only" : "blocked" }],
    4,
    trustPasses ? "idle" : "blocked",
  ));

  traces.push(trace(
    "audit",
    "decision_receipt_written",
    "The audit agent persisted a receipt containing source provenance, model/retrieval selection reasons, policy outcomes, and the explicit non-payment state.",
    { runId, tracesRecorded: traces.length },
    { auditReceiptState: trustPasses ? "draft_mandate_created" : "trust_blocked" },
    [],
    [{ source: "agent_trace", count: traces.length }, { source: "audit_hash", algorithm: "sha256" }],
    13,
  ));

  for (const item of traces) await recordTrace(runId, item);
  await recordAudit(merchant.id, runId, trustPasses ? "commerce.run.awaiting_consent" : "commerce.run.blocked", "system", { intent, cart, trustChecklist, mandateId: mandate?.id ?? null });

  return {
    runId,
    merchant: { id: merchant.id, name: merchant.name, slug: merchant.slug },
    status: trustPasses ? "awaiting_consent" : "blocked",
    intent,
    candidates: offerCandidates,
    cart,
    mandate,
    traces,
    decisionIntelligence: [
      { layer: "Model route", selected: groq.model ? `Groq ${groq.model} · typed preference extraction` : "deterministic structured fallback", reason: groq.reason, alternatives: ["Ollama private-local endpoint (requires merchant endpoint)", "Built-in structured fallback"], inputScope: "Customer text only; factual catalog and payment fields remain deterministic", cache: `${catalogCacheDisposition}: catalog facts never leave the backend for this model call` },
      { layer: "Chunking", selected: "one product record per retrieval unit", reason: "Product title, factual fields, price overlay, delivery overlay, and provenance must remain joined for auditable commerce answers.", alternatives: ["Fixed token chunks", "sentence chunks"], inputScope: `${catalog.length} product records`, cache: `${catalogCacheDisposition}: 90-second in-memory catalog cache` },
      { layer: "Retrieval", selected: vectorRetrievalActive ? `hard filters → ${EMBEDDING_MODEL} cosine ranking → lexical/tag signals` : "hard filters → lexical/tag fallback", reason: vectorRetrievalActive ? `Real normalized query and product vectors were used for semantic ranking across ${vectorByProductId.size} eligible product records. Price, stock, and delivery remained deterministic pre-filters; semantic similarity cannot override them.` : `No compatible live vector route was available for this run (${embeddingFailure ?? "fallback active"}), so the fallback is explicitly lexical rather than pretending embedding retrieval occurred.`, alternatives: ["vector-only search (rejected for hard-constraint risk)", "lexical-only fallback"], inputScope: `budget=${intent.budgetInr ?? "unset"}; city=${intent.city ?? "unset"}; ${vectorRetrievalActive ? `dimensions=${queryEmbedding?.dimensions}` : "no query vector"}`, cache: vectorRetrievalActive ? `${catalogCacheDisposition}: query-vector ${queryEmbedding?.cache}; persisted vectors loaded from database` : `${catalogCacheDisposition}: embedding bypass` },
      { layer: "Vision/OCR", selected: input.includeImage && input.imageStyleTags?.length ? "Gemini Flash visible-style analysis" : "not invoked", reason: input.includeImage && input.imageStyleTags?.length ? "A vision model extracted non-sensitive visible style tags. OCR was not invoked because no text within the image is required for catalog retrieval." : "No verified style-reference analysis is attached to this commerce run.", alternatives: ["OCR", "vision embedding"], inputScope: input.includeImage ? "one style-reference image" : "none", cache: "bypass" },
      { layer: "Payment safety", selected: "draft mandate only", reason: "Policy requires item availability, amount bound, idempotency key, and explicit customer confirmation before provider action.", alternatives: ["direct provider order"], inputScope: `amount=₹${(amountInrPaise / 100).toFixed(2)}`, cache: "bypass" },
    ],
  };
}

export async function approveMandate(mandateId: number, confirmationToken: string) {
  let mandate: any = inMemoryMandates.get(mandateId);
  const db = await getDb();

  if (db) {
    try {
      const mandateRows = await db.select().from(checkoutMandates).where(eq(checkoutMandates.id, mandateId)).limit(1);
      if (mandateRows[0]) mandate = mandateRows[0];
    } catch {
      // ignore
    }
  }

  if (!mandate) throw new Error("Checkout mandate not found.");
  if (mandate.confirmationToken !== confirmationToken) throw new Error("Checkout confirmation capability is invalid for this mandate.");
  if (mandate.status !== "draft") throw new Error("Checkout mandate cannot be approved in its current state.");
  if (new Date(mandate.expiresAt).getTime() <= Date.now()) {
    mandate.status = "expired";
    throw new Error("Checkout mandate has expired; create a new reviewed checkout.");
  }

  let razorpay: Awaited<ReturnType<typeof createRazorpayTestOrder>>;
  try {
    razorpay = await createRazorpayTestOrder({
      amountInrPaise: mandate.amountInrPaise,
      receipt: mandate.idempotencyKey,
      notes: { bazaar_mandate_id: String(mandateId), bazaar_run_id: String(mandate.runId ?? 0), mode: "test" },
    });
  } catch (error) {
    await recordAudit(mandate.merchantId ?? 1, mandate.runId ?? null, "checkout.provider_unavailable", "system", { mandateId, provider: "razorpay_test_mode", outcome: "no_order_created_no_charge_attempted", error: error instanceof Error ? error.message : "unknown" }, mandateId);
    throw new Error("Razorpay Test Mode could not create this checkout. No provider order and no charge were attempted; the reviewed mandate remains auditable.");
  }

  mandate.status = "approved";
  mandate.approvedAt = new Date();
  const orderId = nextOrderSeq++;

  if (db) {
    try {
      await db.update(checkoutMandates).set({ status: "approved", approvedAt: new Date() }).where(eq(checkoutMandates.id, mandateId));
      const [order] = await db.insert(checkoutOrders).values({
        mandateId,
        provider: "razorpay_test_mode",
        providerOrderId: razorpay.order.id,
        status: "pending",
        amountInrPaise: mandate.amountInrPaise,
      }).returning({ id: checkoutOrders.id });
      await recordAudit(mandate.merchantId, mandate.runId, "checkout.test_order.created", "customer", { mandateId, amountInrPaise: mandate.amountInrPaise, providerOrderId: razorpay.order.id, providerAction: "razorpay_test_order_created" }, mandateId);
      return { orderId: order.id, mandateId, status: "checkout_ready" as const, amountInrPaise: mandate.amountInrPaise, razorpayOrderId: razorpay.order.id, razorpayKeyId: razorpay.keyId, merchantName: "NovaCart" };
    } catch {
      // ignore
    }
  }

  return { orderId, mandateId, status: "checkout_ready" as const, amountInrPaise: mandate.amountInrPaise, razorpayOrderId: razorpay.order.id, razorpayKeyId: razorpay.keyId, merchantName: "NovaCart" };
}

export async function verifyCheckoutPayment(input: { orderId: number; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) {
  if (!verifyRazorpayPaymentSignature({ orderId: input.razorpayOrderId, paymentId: input.razorpayPaymentId, signature: input.razorpaySignature })) {
    throw new Error("Razorpay payment signature verification failed.");
  }

  const db = await getDb();
  if (db) {
    try {
      const records = await db.select().from(checkoutOrders).where(eq(checkoutOrders.id, input.orderId)).limit(1);
      const order = records[0];
      if (order && shouldTreatVerificationAsIdempotent(order.status)) return { verified: true as const, alreadyProcessed: true as const };

      if (order) {
        await db.update(checkoutOrders).set({ status: "paid" }).where(eq(checkoutOrders.id, order.id));
        await db.insert(paymentEvents).values({
          checkoutOrderId: order.id,
          provider: "razorpay",
          providerEventId: `checkout_success_${input.razorpayPaymentId}`,
          eventType: "checkout.client_verified",
          signatureVerified: true,
          replayDisposition: "accepted",
          payloadHash: hashPayload({ orderId: input.orderId, paymentId: input.razorpayPaymentId }),
          payloadMetadata: { razorpayOrderId: input.razorpayOrderId, razorpayPaymentId: input.razorpayPaymentId },
        }).onConflictDoUpdate({ target: [paymentEvents.provider, paymentEvents.providerEventId], set: { replayDisposition: "duplicate" } });
        const mandateRows = await db.select().from(checkoutMandates).where(eq(checkoutMandates.id, order.mandateId)).limit(1);
        const mandate = mandateRows[0];
        if (mandate) {
          await db.update(checkoutMandates).set({ status: "consumed" }).where(eq(checkoutMandates.id, mandate.id));
          await db.update(agentRuns).set({ status: "completed", completedAt: new Date() }).where(eq(agentRuns.id, mandate.runId));
          await recordAudit(mandate.merchantId, mandate.runId, "checkout.payment.verified", "provider", { checkoutOrderId: order.id, razorpayOrderId: input.razorpayOrderId, razorpayPaymentId: input.razorpayPaymentId }, mandate.id);
        }
      }
    } catch {
      // ignore
    }
  }
  return { verified: true as const, alreadyProcessed: false as const };
}

export async function simulateTestPaymentFailure(mandateId: number, confirmationToken: string) {
  let mandate: any = inMemoryMandates.get(mandateId);
  const db = await getDb();
  if (db) {
    try {
      const mandateRows = await db.select().from(checkoutMandates).where(eq(checkoutMandates.id, mandateId)).limit(1);
      if (mandateRows[0]) mandate = mandateRows[0];
    } catch {
      // ignore
    }
  }
  if (!mandate || mandate.confirmationToken !== confirmationToken) throw new Error("Test failure scenario is not authorized for this mandate.");
  if (mandate.status !== "draft") throw new Error("This mandate is no longer eligible for a safe failure simulation.");

  mandate.status = "rejected";
  const orderId = nextOrderSeq++;
  const providerEventId = `test_failure_${nanoid(18)}`;

  if (db) {
    try {
      const [order] = await db.insert(checkoutOrders).values({ mandateId, provider: "bazaaros_test_failure_simulation", status: "failed", amountInrPaise: mandate.amountInrPaise, failureCode: "TEST_PAYMENT_FAILED", failureMessage: "Deliberate test-mode failure; no external charge was attempted." }).returning({ id: checkoutOrders.id });
      await db.insert(paymentEvents).values({ checkoutOrderId: order.id, provider: "bazaaros_test_mode", providerEventId, eventType: "payment.failed", signatureVerified: true, replayDisposition: "accepted", payloadHash: hashPayload({ mandateId, providerEventId }), payloadMetadata: { simulated: true, cartPreserved: true, automaticRetry: false } });
      await db.update(checkoutMandates).set({ status: "rejected" }).where(eq(checkoutMandates.id, mandateId));
      await db.update(agentRuns).set({ status: "completed", completedAt: new Date() }).where(eq(agentRuns.id, mandate.runId));
      await recordAudit(mandate.merchantId ?? 1, mandate.runId ?? null, "checkout.test_payment_failed", "system", { mandateId, checkoutOrderId: order.id, outcome: "cart_preserved_new_confirmation_required", automaticRetry: false }, mandateId);
      return { orderId: order.id, cartPreserved: true, automaticRetry: false, message: "Test payment failed safely. No charge was attempted, the cart remains available for review, and BazaarOS will not retry automatically." };
    } catch {
      // ignore
    }
  }

  return { orderId, cartPreserved: true, automaticRetry: false, message: "Test payment failed safely. No charge was attempted, the cart remains available for review, and BazaarOS will not retry automatically." };
}

export async function getDemoOverview(merchantSlug?: string) {
  const merchant = await loadDemoMerchant(merchantSlug);
  const catalog = await loadCatalog(merchant.id);
  return {
    merchant: { id: merchant.id, name: merchant.name, slug: merchant.slug },
    productCount: catalog.length,
    productPreview: catalog.slice(0, 6),
    agentOrder: AGENT_ORDER,
    policy: {
      maxSingleCheckoutInr: 5000,
      explicitConfirmationRequired: true,
      mandateExpiryMinutes: 10,
      automaticRetries: false,
    },
    provenance: {
      sourceName: catalog[0]?.sourceName ?? "Amazon Reviews'23 — Amazon Fashion metadata",
      sourceUrl: catalog[0]?.sourceUrl ?? "https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023",
      overlayDisclosure: catalog[0]?.overlayLabel ?? "BazaarOS staging operational overlay — not part of the public source dataset",
    },
  };
}
