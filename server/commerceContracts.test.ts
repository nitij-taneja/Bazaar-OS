import { describe, expect, it } from "vitest";
import { serializeProvenanceFact, shouldTreatVerificationAsIdempotent } from "./bazaar";

describe("commerce decision contracts", () => {
  it("treats an already-paid checkout as idempotently verified", () => {
    expect(shouldTreatVerificationAsIdempotent("paid")).toBe(true);
    expect(shouldTreatVerificationAsIdempotent("pending")).toBe(false);
    expect(shouldTreatVerificationAsIdempotent("failed")).toBe(false);
  });
  it("serializes source, overlay, and inference provenance without collapsing their kinds", () => {
    expect(serializeProvenanceFact({ factKey: "test_price_inr", factValue: "₹1,299", factKind: "operational_overlay", sourcePointer: "BazaarOS test-price conversion", confidence: "deterministic_overlay" })).toEqual({ label: "test price inr", value: "₹1,299", kind: "operational_overlay", pointer: "BazaarOS test-price conversion", confidence: "deterministic_overlay" });
  });
});
