import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), embedDocuments: vi.fn(), clearEmbeddingQueryCache: vi.fn() }));

vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("./embeddings", () => ({ EMBEDDING_MODEL: "test-embedding-model", embedDocuments: mocks.embedDocuments, clearEmbeddingQueryCache: mocks.clearEmbeddingQueryCache, embeddingInputSha256: () => "vector-input-hash" }));

import { updateMerchantCatalogProduct } from "./merchantCatalog";

function chain(result: unknown) {
  const cursor: Record<string, unknown> = {};
  ["from", "innerJoin", "leftJoin", "where", "orderBy"].forEach(name => { cursor[name] = vi.fn(() => cursor); });
  cursor.limit = vi.fn(async () => result);
  return cursor;
}

function createDb(sourcePublisher: string) {
  const selects = [
    [{ product: { id: 41, catalogDocument: "original source document" }, overlay: { id: 7 }, source: { publisher: sourcePublisher } }],
    [{ catalogDocument: "updated retrieval document" }],
  ];
  const updateSets: Array<Record<string, unknown>> = [];
  const auditPayloads: Array<Record<string, unknown>> = [];
  return {
    db: {
      select: vi.fn(() => chain(selects.shift() ?? [])),
      update: vi.fn(() => ({ set: vi.fn((value: Record<string, unknown>) => { updateSets.push(value); return { where: vi.fn(async () => []) }; }) })),
      insert: vi.fn(() => ({ values: vi.fn((value: Record<string, unknown>) => { auditPayloads.push(value); return { onConflictDoUpdate: vi.fn(async () => {}) }; }) })),
    },
    updateSets,
    auditPayloads,
  };
}

const row = { title: "Merchant Wallet", brand: "Nivara", description: "Gift-ready leather wallet", imageUrl: "https://example.com/wallet.jpg", priceInr: 1299, inventory: 5, deliveryCities: ["Delhi"], deliveryEtaText: "2 days", styleTags: ["minimal"], occasionTags: ["gift"] };

describe("updateMerchantCatalogProduct", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("protects public-source identity, audits the operational update, and reports pending vectors when reindexing fails", async () => {
    const fixture = createDb("Amazon Reviews'23");
    mocks.getDb.mockResolvedValue(fixture.db);
    mocks.embedDocuments.mockRejectedValueOnce(new Error("provider unavailable"));
    const result = await updateMerchantCatalogProduct({ merchantId: 1, actorUserId: 9, productId: 41, row });
    expect(result).toMatchObject({ updated: true, productId: 41, sourceRecordImmutable: true, embedding: "pending" });
    expect(fixture.updateSets[1]).not.toHaveProperty("description");
    expect(fixture.auditPayloads.at(-1)?.payload).toMatchObject({ productId: 41, sourceRecordImmutable: true, embedding: "pending" });
  });

  it("allows merchant-uploaded identity edits, refreshes vectors, and audits the indexed outcome", async () => {
    const fixture = createDb("Merchant operator");
    mocks.getDb.mockResolvedValue(fixture.db);
    mocks.embedDocuments.mockResolvedValueOnce([[0.1, 0.2, 0.3]]);
    const result = await updateMerchantCatalogProduct({ merchantId: 1, actorUserId: 9, productId: 41, row });
    expect(result).toMatchObject({ updated: true, productId: 41, sourceRecordImmutable: false, embedding: "indexed" });
    expect(fixture.updateSets[1]).toMatchObject({ title: "Merchant Wallet", description: "Gift-ready leather wallet", sourceImageUrl: "https://example.com/wallet.jpg" });
    expect(fixture.auditPayloads.at(-1)?.payload).toMatchObject({ productId: 41, sourceRecordImmutable: false, embedding: "indexed" });
    expect(mocks.clearEmbeddingQueryCache).toHaveBeenCalled();
  });
});
