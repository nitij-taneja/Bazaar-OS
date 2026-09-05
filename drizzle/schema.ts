import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const nowDefault = sql`(unixepoch())`;

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = sqliteTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** OAuth identifier (openId) returned from the OAuth callback, or a local "demo-" id in standalone mode. Unique per user. */
  openId: text("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: text("email", { length: 320 }),
  loginMethod: text("loginMethod", { length: 64 }),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(nowDefault),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().default(nowDefault).$onUpdate(() => new Date()),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).notNull().default(nowDefault),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const merchants = sqliteTable("merchants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: integer("ownerId").notNull(),
  name: text("name", { length: 160 }).notNull(),
  slug: text("slug", { length: 120 }).notNull(),
  description: text("description"),
  defaultCurrency: text("defaultCurrency", { length: 3 }).notNull().default("INR"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(nowDefault),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().default(nowDefault).$onUpdate(() => new Date()),
}, table => [uniqueIndex("merchants_slug_unique").on(table.slug), index("merchants_owner_idx").on(table.ownerId)]);

export const catalogSources = sqliteTable("catalogSources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  merchantId: integer("merchantId").notNull(),
  name: text("name", { length: 200 }).notNull(),
  publisher: text("publisher", { length: 200 }).notNull(),
  sourceUrl: text("sourceUrl").notNull(),
  retrievedAt: integer("retrievedAt", { mode: "timestamp" }).notNull(),
  sourceNotes: text("sourceNotes").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(nowDefault),
}, table => [index("catalog_sources_merchant_idx").on(table.merchantId)]);

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  merchantId: integer("merchantId").notNull(),
  catalogSourceId: integer("catalogSourceId").notNull(),
  sourceProductId: text("sourceProductId", { length: 128 }).notNull(),
  title: text("title").notNull(),
  brand: text("brand", { length: 200 }),
  description: text("description"),
  features: text("features", { mode: "json" }).$type<string[]>().notNull(),
  sourceDetails: text("sourceDetails", { mode: "json" }).$type<Record<string, string>>().notNull(),
  sourceImageUrl: text("sourceImageUrl"),
  sourcePriceUsdCents: integer("sourcePriceUsdCents"),
  sourceAverageRating: text("sourceAverageRating", { length: 16 }),
  sourceRatingCount: integer("sourceRatingCount"),
  boughtTogetherIds: text("boughtTogetherIds", { mode: "json" }).$type<string[]>().notNull(),
  catalogDocument: text("catalogDocument").notNull(),
  documentSha256: text("documentSha256", { length: 64 }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(nowDefault),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().default(nowDefault).$onUpdate(() => new Date()),
}, table => [
  uniqueIndex("products_merchant_source_product_unique").on(table.merchantId, table.sourceProductId),
  index("products_merchant_idx").on(table.merchantId),
  index("products_source_idx").on(table.catalogSourceId),
]);

export const productOperationalOverlays = sqliteTable("productOperationalOverlays", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("productId").notNull(),
  testPriceInrPaise: integer("testPriceInrPaise").notNull(),
  testInventory: integer("testInventory").notNull(),
  deliveryCities: text("deliveryCities", { mode: "json" }).$type<string[]>().notNull(),
  deliveryEtaText: text("deliveryEtaText", { length: 160 }).notNull(),
  styleTags: text("styleTags", { mode: "json" }).$type<string[]>().notNull(),
  occasionTags: text("occasionTags", { mode: "json" }).$type<string[]>().notNull(),
  overlayLabel: text("overlayLabel", { length: 200 }).notNull(),
  overlayRationale: text("overlayRationale").notNull(),
  isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
  isSponsored: integer("isSponsored", { mode: "boolean" }).notNull().default(false),
  sponsorBoost: real("sponsorBoost").notNull().default(0),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().default(nowDefault).$onUpdate(() => new Date()),
}, table => [uniqueIndex("product_operational_overlay_product_unique").on(table.productId)]);

export const productFacts = sqliteTable("productFacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("productId").notNull(),
  factKey: text("factKey", { length: 120 }).notNull(),
  factValue: text("factValue").notNull(),
  factKind: text("factKind", { enum: ["source", "operational_overlay", "inference"] }).notNull(),
  sourcePointer: text("sourcePointer", { length: 240 }).notNull(),
  confidence: text("confidence", { length: 32 }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(nowDefault),
}, table => [uniqueIndex("product_fact_unique").on(table.productId, table.factKey, table.factKind), index("product_facts_product_idx").on(table.productId)]);

export const productEmbeddings = sqliteTable("productEmbeddings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("productId").notNull(),
  model: text("model", { length: 160 }).notNull(),
  dimensions: integer("dimensions").notNull(),
  inputSha256: text("inputSha256", { length: 64 }).notNull(),
  vector: text("vector", { mode: "json" }).$type<number[]>().notNull(),
  normalized: integer("normalized", { mode: "boolean" }).notNull().default(true),
  generatedAt: integer("generatedAt", { mode: "timestamp" }).notNull().default(nowDefault),
}, table => [uniqueIndex("product_embedding_product_model_unique").on(table.productId, table.model), index("product_embeddings_product_idx").on(table.productId)]);

export const productBundles = sqliteTable("productBundles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  primaryProductId: integer("primaryProductId").notNull(),
  accessoryProductId: integer("accessoryProductId").notNull(),
  rationale: text("rationale").notNull(),
  confidence: text("confidence", { length: 8 }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(nowDefault),
}, table => [uniqueIndex("product_bundle_unique").on(table.primaryProductId, table.accessoryProductId)]);

export const commerceIntents = sqliteTable("commerceIntents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  merchantId: integer("merchantId").notNull(),
  userId: integer("userId"),
  channel: text("channel", { enum: ["text", "voice", "image", "a2a"] }).notNull(),
  rawInput: text("rawInput").notNull(),
  normalizedIntent: text("normalizedIntent", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  imageAssetKey: text("imageAssetKey"),
  audioAssetKey: text("audioAssetKey"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(nowDefault),
}, table => [index("commerce_intents_merchant_idx").on(table.merchantId)]);

export const agentRuns = sqliteTable("agentRuns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  merchantId: integer("merchantId").notNull(),
  intentId: integer("intentId").notNull(),
  status: text("status", { enum: ["queued", "running", "awaiting_consent", "completed", "blocked", "failed"] }).notNull().default("queued"),
  modelProfile: text("modelProfile", { length: 64 }).notNull(),
  cacheDisposition: text("cacheDisposition", { enum: ["miss", "partial_hit", "hit", "bypass"] }).notNull(),
  startedAt: integer("startedAt", { mode: "timestamp" }).notNull().default(nowDefault),
  completedAt: integer("completedAt", { mode: "timestamp" }),
}, table => [index("agent_runs_merchant_idx").on(table.merchantId), index("agent_runs_intent_idx").on(table.intentId)]);

export const agentSteps = sqliteTable("agentSteps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  runId: integer("runId").notNull(),
  agentName: text("agentName", { enum: ["intent", "catalog", "offer", "a2a", "trust", "merchant_ack", "checkout", "audit"] }).notNull(),
  status: text("status", { enum: ["idle", "active", "completed", "blocked", "error"] }).notNull(),
  decisionKind: text("decisionKind", { length: 100 }).notNull(),
  rationale: text("rationale").notNull(),
  inputSummary: text("inputSummary", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  outputSummary: text("outputSummary", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  alternatives: text("alternatives", { mode: "json" }).$type<Array<Record<string, unknown>>>().notNull(),
  provenance: text("provenance", { mode: "json" }).$type<Array<Record<string, unknown>>>().notNull(),
  latencyMs: integer("latencyMs").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(nowDefault),
}, table => [index("agent_steps_run_idx").on(table.runId)]);

export const checkoutMandates = sqliteTable("checkoutMandates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  runId: integer("runId").notNull(),
  merchantId: integer("merchantId").notNull(),
  cartSnapshot: text("cartSnapshot", { mode: "json" }).$type<Array<Record<string, unknown>>>().notNull(),
  amountInrPaise: integer("amountInrPaise").notNull(),
  authorityScope: text("authorityScope", { length: 80 }).notNull(),
  status: text("status", { enum: ["draft", "approved", "rejected", "expired", "consumed"] }).notNull().default("draft"),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  approvedAt: integer("approvedAt", { mode: "timestamp" }),
  idempotencyKey: text("idempotencyKey", { length: 128 }).notNull(),
  confirmationToken: text("confirmationToken", { length: 128 }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(nowDefault),
}, table => [uniqueIndex("checkout_mandate_idempotency_unique").on(table.idempotencyKey), uniqueIndex("checkout_mandate_confirmation_unique").on(table.confirmationToken), index("checkout_mandates_run_idx").on(table.runId)]);

export const checkoutOrders = sqliteTable("checkoutOrders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mandateId: integer("mandateId").notNull(),
  provider: text("provider", { length: 40 }).notNull(),
  providerOrderId: text("providerOrderId", { length: 128 }),
  status: text("status", { enum: ["created", "pending", "paid", "failed", "cancelled"] }).notNull(),
  amountInrPaise: integer("amountInrPaise").notNull(),
  failureCode: text("failureCode", { length: 120 }),
  failureMessage: text("failureMessage"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(nowDefault),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().default(nowDefault).$onUpdate(() => new Date()),
}, table => [index("checkout_orders_mandate_idx").on(table.mandateId)]);

export const paymentEvents = sqliteTable("paymentEvents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  checkoutOrderId: integer("checkoutOrderId"),
  provider: text("provider", { length: 40 }).notNull(),
  providerEventId: text("providerEventId", { length: 160 }).notNull(),
  eventType: text("eventType", { length: 120 }).notNull(),
  signatureVerified: integer("signatureVerified", { mode: "boolean" }).notNull().default(false),
  replayDisposition: text("replayDisposition", { enum: ["accepted", "duplicate", "rejected"] }).notNull(),
  payloadHash: text("payloadHash", { length: 64 }).notNull(),
  payloadMetadata: text("payloadMetadata", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  processedAt: integer("processedAt", { mode: "timestamp" }).notNull().default(nowDefault),
}, table => [uniqueIndex("payment_event_provider_event_unique").on(table.provider, table.providerEventId), index("payment_events_order_idx").on(table.checkoutOrderId)]);

export const auditEvents = sqliteTable("auditEvents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  merchantId: integer("merchantId").notNull(),
  runId: integer("runId"),
  mandateId: integer("mandateId"),
  eventType: text("eventType", { length: 120 }).notNull(),
  actorType: text("actorType", { enum: ["customer", "agent", "system", "merchant", "provider"] }).notNull(),
  payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  integrityHash: text("integrityHash", { length: 64 }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(nowDefault),
}, table => [index("audit_events_merchant_idx").on(table.merchantId), index("audit_events_run_idx").on(table.runId)]);

export type Merchant = typeof merchants.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductOperationalOverlay = typeof productOperationalOverlays.$inferSelect;
export type AgentRun = typeof agentRuns.$inferSelect;
export type AgentStep = typeof agentSteps.$inferSelect;
