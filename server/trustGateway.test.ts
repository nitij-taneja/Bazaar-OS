import { describe, expect, it } from "vitest";
import { evaluateTrustGateway } from "./bazaar";

describe("deterministic Trust Gateway", () => {
  it("permits only a valid human-present draft mandate within the fixed amount bound", () => {
    expect(evaluateTrustGateway({ hasCandidate: true, amountInrPaise: 249900, authorityScope: "HUMAN_PRESENT_CONFIRMATION_REQUIRED" }).passes).toBe(true);
  });
  it("blocks a buyer-agent quote scope even when a product and amount are valid", () => {
    const result = evaluateTrustGateway({ hasCandidate: true, amountInrPaise: 249900, authorityScope: "SEARCH_AND_QUOTE_ONLY" });
    expect(result.passes).toBe(false);
    expect(result.checklist.humanAuthority).toBe(false);
  });
  it("blocks missing inventory and any amount beyond the default limit unless step-up authorized", () => {
    expect(evaluateTrustGateway({ hasCandidate: false, amountInrPaise: 200000, authorityScope: "HUMAN_PRESENT_CONFIRMATION_REQUIRED" }).passes).toBe(false);
    expect(evaluateTrustGateway({ hasCandidate: true, amountInrPaise: 500001, authorityScope: "HUMAN_PRESENT_CONFIRMATION_REQUIRED" }).passes).toBe(false);
    expect(evaluateTrustGateway({ hasCandidate: true, amountInrPaise: 899900, authorityScope: "HUMAN_PRESENT_CONFIRMATION_REQUIRED", stepUpAuthorized: true }).passes).toBe(true);
  });
});
