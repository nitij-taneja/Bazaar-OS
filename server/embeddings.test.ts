import { describe, expect, it } from "vitest";
import { cosineSimilarity, embeddingInputSha256 } from "./embeddings";

describe("embedding retrieval primitives", () => {
  it("keeps document hashes stable for unchanged product records", () => {
    expect(embeddingInputSha256("black leather wallet")).toBe(embeddingInputSha256("black leather wallet"));
    expect(embeddingInputSha256("black leather wallet")).not.toBe(embeddingInputSha256("brown leather wallet"));
  });

  it("scores normalized matching vectors above orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBe(1);
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBe(0);
    expect(cosineSimilarity([1, 0], [1, 0, 0])).toBe(0);
  });
});
