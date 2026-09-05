import { describe, expect, it } from "vitest";
import { mayEditSourceIdentity } from "./merchantCatalog";

describe("merchant product edit provenance boundary", () => {
  it("permits source identity edits only for first-party merchant uploads", () => {
    expect(mayEditSourceIdentity("Merchant operator")).toBe(true);
    expect(mayEditSourceIdentity("Amazon Reviews'23")).toBe(false);
  });
});
