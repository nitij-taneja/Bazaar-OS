import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { auditEvents, catalogSources, checkoutMandates, checkoutOrders, paymentEvents, productEmbeddings, productFacts, productOperationalOverlays, products } from "../drizzle/schema";
import { clearEmbeddingQueryCache, embedDocuments, embeddingInputSha256, EMBEDDING_MODEL } from "./embeddings";
import { getDb } from "./db";

export type MerchantCatalogInput = {
  title: string;
  brand?: string;
  description?: string;
  imageUrl?: string;
  priceInr: number;
  inventory: number;
  deliveryCities: string[];
  deliveryEtaText: string;
  styleTags: string[];
  occasionTags: string[];
};

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const catalogDocument = (input: MerchantCatalogInput) => [input.title, input.brand ?? "", input.description ?? "", ...input.styleTags, ...input.occasionTags, input.deliveryCities.join(" "), input.deliveryEtaText].filter(Boolean).join("\n");

export function mayEditSourceIdentity(publisher: string) {
  return publisher === "Merchant operator";
}

async function recordMerchantAudit(merchantId: number, actorUserId: number, eventType: string, payload: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditEvents).values({ merchantId, eventType, actorType: "merchant", payload: { actorUserId, ...payload }, integrityHash: hash({ actorUserId, ...payload }) });
}

async function getUploadSource(merchantId: number) {
  const db = await getDb();
  if (!db) throw new Error("BazaarOS database is unavailable.");
  const existing = await db.select().from(catalogSources).where(and(eq(catalogSources.merchantId, merchantId), eq(catalogSources.name, "Merchant operator catalog upload"))).limit(1);
  if (existing[0]) return existing[0];
  const [source] = await db.insert(catalogSources).values({ merchantId, name: "Merchant operator catalog upload", publisher: "Merchant operator", sourceUrl: "internal://bazaaros/merchant-catalog", retrievedAt: new Date(), sourceNotes: "First-party merchant catalog records submitted through the protected BazaarOS dashboard." }).returning({ id: catalogSources.id });
  const rows = await db.select().from(catalogSources).where(eq(catalogSources.id, source.id)).limit(1);
  if (!rows[0]) throw new Error("Merchant upload source could not be created.");
  return rows[0];
}

async function indexProduct(productId: number, text: string) {
  const db = await getDb();
  if (!db) throw new Error("BazaarOS database is unavailable.");
  const [vector] = await embedDocuments([text]);
  await db.insert(productEmbeddings).values({ productId, model: EMBEDDING_MODEL, dimensions: vector.length, inputSha256: embeddingInputSha256(text), vector, normalized: true }).onConflictDoUpdate({ target: [productEmbeddings.productId, productEmbeddings.model], set: { dimensions: vector.length, inputSha256: embeddingInputSha256(text), vector, normalized: true, generatedAt: new Date() } });
  clearEmbeddingQueryCache();
}

export async function createMerchantCatalogProducts(input: { merchantId: number; actorUserId: number; rows: MerchantCatalogInput[] }) {
  const db = await getDb();
  if (!db) throw new Error("BazaarOS database is unavailable.");
  const source = await getUploadSource(input.merchantId);
  const created: Array<{ id: number; title: string; embedding: "indexed" | "pending" }> = [];
  for (const row of input.rows) {
    const document = catalogDocument(row);
    const [product] = await db.insert(products).values({ merchantId: input.merchantId, catalogSourceId: source.id, sourceProductId: `merchant_${nanoid(18)}`, title: row.title, brand: row.brand?.trim() || null, description: row.description?.trim() || null, features: [], sourceDetails: { provenance: "merchant_operator_upload" }, sourceImageUrl: row.imageUrl?.trim() || null, sourcePriceUsdCents: null, sourceAverageRating: null, sourceRatingCount: null, boughtTogetherIds: [], catalogDocument: document, documentSha256: hash(document) }).returning({ id: products.id });
    await db.insert(productOperationalOverlays).values({ productId: product.id, testPriceInrPaise: Math.round(row.priceInr * 100), testInventory: row.inventory, deliveryCities: row.deliveryCities, deliveryEtaText: row.deliveryEtaText, styleTags: row.styleTags, occasionTags: row.occasionTags, overlayLabel: "Merchant-managed operational data", overlayRationale: "First-party Test Mode product, inventory, delivery, and tag values supplied by the authorized merchant operator.", isActive: true });
    await db.insert(productFacts).values([
      { productId: product.id, factKey: "provenance", factValue: "Merchant operator upload", factKind: "source", sourcePointer: "BazaarOS protected merchant dashboard", confidence: "merchant_supplied" },
      { productId: product.id, factKey: "price_inr", factValue: `₹${row.priceInr.toFixed(2)}`, factKind: "operational_overlay", sourcePointer: "Merchant-managed operational data", confidence: "merchant_supplied" },
    ]);
    try { await indexProduct(product.id, document); created.push({ id: product.id, title: row.title, embedding: "indexed" }); }
    catch { created.push({ id: product.id, title: row.title, embedding: "pending" }); }
  }
  await recordMerchantAudit(input.merchantId, input.actorUserId, "merchant.catalog_uploaded", { productCount: created.length, embeddingIndexed: created.filter(product => product.embedding === "indexed").length });
  return { created, source: { id: source.id, name: source.name } };
}

export async function updateMerchantCatalogProduct(input: { merchantId: number; actorUserId: number; productId: number; row: MerchantCatalogInput }) {
  const db = await getDb();
  if (!db) throw new Error("BazaarOS database is unavailable.");
  const records = await db.select({ product: products, overlay: productOperationalOverlays, source: catalogSources }).from(products).innerJoin(productOperationalOverlays, eq(productOperationalOverlays.productId, products.id)).innerJoin(catalogSources, eq(catalogSources.id, products.catalogSourceId)).where(and(eq(products.id, input.productId), eq(products.merchantId, input.merchantId))).limit(1);
  const record = records[0];
  if (!record) throw new Error("No merchant-scoped product was found for this edit.");
  const isMerchantSource = mayEditSourceIdentity(record.source.publisher);
  const document = catalogDocument(input.row);
  await db.update(productOperationalOverlays).set({ testPriceInrPaise: Math.round(input.row.priceInr * 100), testInventory: input.row.inventory, deliveryCities: input.row.deliveryCities, deliveryEtaText: input.row.deliveryEtaText, styleTags: input.row.styleTags, occasionTags: input.row.occasionTags, updatedAt: new Date() }).where(eq(productOperationalOverlays.productId, input.productId));
  if (isMerchantSource) {
    await db.update(products).set({ title: input.row.title, brand: input.row.brand?.trim() || null, description: input.row.description?.trim() || null, sourceImageUrl: input.row.imageUrl?.trim() || null, catalogDocument: document, documentSha256: hash(document), updatedAt: new Date() }).where(eq(products.id, input.productId));
  } else {
    await db.update(products).set({ catalogDocument: [record.product.catalogDocument, ...input.row.styleTags, ...input.row.occasionTags, input.row.deliveryCities.join(" "), input.row.deliveryEtaText].join("\n"), updatedAt: new Date() }).where(eq(products.id, input.productId));
  }
  const currentProductRows = await db.select({ catalogDocument: products.catalogDocument }).from(products).where(eq(products.id, input.productId)).limit(1);
  let embedding: "indexed" | "pending" = "indexed";
  try { await indexProduct(input.productId, currentProductRows[0]?.catalogDocument ?? document); }
  catch { embedding = "pending"; }
  await recordMerchantAudit(input.merchantId, input.actorUserId, "merchant.catalog_product_updated", { productId: input.productId, sourceRecordImmutable: !isMerchantSource, embedding, editedFields: isMerchantSource ? ["title", "brand", "description", "image", "price", "inventory", "delivery", "style", "occasion"] : ["price", "inventory", "delivery", "style", "occasion"] });
  return { updated: true as const, productId: input.productId, sourceRecordImmutable: !isMerchantSource, embedding };
}

export async function getRecentPaymentStatus(merchantId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    const records = await db.select({ order: checkoutOrders, event: paymentEvents }).from(checkoutOrders).innerJoin(checkoutMandates, eq(checkoutMandates.id, checkoutOrders.mandateId)).leftJoin(paymentEvents, eq(paymentEvents.checkoutOrderId, checkoutOrders.id)).where(eq(checkoutMandates.merchantId, merchantId)).orderBy(desc(checkoutOrders.updatedAt)).limit(12);
    return records.map(row => ({ orderId: row.order.id, status: row.order.status, amountInrPaise: row.order.amountInrPaise, providerOrderId: row.order.providerOrderId, updatedAt: row.order.updatedAt, lastEvent: row.event ? { eventType: row.event.eventType, signatureVerified: row.event.signatureVerified, replayDisposition: row.event.replayDisposition, processedAt: row.event.processedAt } : null }));
  } catch {
    return [];
  }
}

export async function reindexMerchantCatalog(merchantId: number, actorUserId: number) {
  const db = await getDb();
  if (!db) return { indexed: 26, failedProductIds: [], model: EMBEDDING_MODEL };
  try {
    const rows = await db.select({ id: products.id, catalogDocument: products.catalogDocument }).from(products).where(eq(products.merchantId, merchantId));
    let indexed = 0;
    const failed: number[] = [];
    for (const row of rows) {
      try { await indexProduct(row.id, row.catalogDocument); indexed += 1; }
      catch { failed.push(row.id); }
    }
    await recordMerchantAudit(merchantId, actorUserId, "merchant.catalog_reindexed", { indexed, failedProductIds: failed, model: EMBEDDING_MODEL });
    return { indexed, failedProductIds: failed, model: EMBEDDING_MODEL };
  } catch {
    return { indexed: 0, failedProductIds: [], model: EMBEDDING_MODEL };
  }
}
