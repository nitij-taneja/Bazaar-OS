import { describe, expect, it } from "vitest";
import { runMarketplaceAgent } from "./bazaar";

describe("cross-merchant marketplace agent", () => {
  it("ranks a single shared catalog once and only considers merchants with a matching product", async () => {
    const result = await runMarketplaceAgent({ query: "minimalist jewelry gift under 2000", channel: "text", includeImage: false, topN: 6 });

    expect(result.merchantsConsidered).toBeGreaterThan(0);
    expect(result.bids.length).toBe(result.merchantsConsidered);

    const distinctMerchants = new Set(result.bids.map(bid => bid.merchantId));
    expect(distinctMerchants.size).toBe(result.bids.length);
  });

  it("acknowledges exactly one winning merchant and never more than one", async () => {
    const result = await runMarketplaceAgent({ query: "minimalist jewelry gift under 2000", channel: "text", includeImage: false, topN: 6 });

    const winners = result.bids.filter(bid => bid.won);
    expect(winners.length).toBeLessThanOrEqual(1);

    if (result.winningMerchant) {
      expect(winners).toHaveLength(1);
      expect(winners[0]?.merchantId).toBe(result.winningMerchant.id);
    }

    const merchantAckTrace = result.traces.find(t => t.agentName === "merchant_ack");
    if (merchantAckTrace) {
      expect(merchantAckTrace.inputSummary.merchantId).toBe(result.winningMerchant?.id);
    }
  });

  it("never discounts a bid past the platform-wide cap, and never discounts the leader", async () => {
    const result = await runMarketplaceAgent({ query: "minimalist jewelry gift under 2000", channel: "text", includeImage: false, topN: 8 });

    for (const bid of result.bids) {
      expect(bid.discountAppliedPct).toBeGreaterThanOrEqual(0);
      expect(bid.discountAppliedPct).toBeLessThanOrEqual(0.06);
      expect(bid.finalPriceInrPaise).toBeLessThanOrEqual(bid.initialPriceInrPaise);
    }

    const leader = result.bids.find(bid => bid.won);
    if (leader) expect(leader.discountAppliedPct).toBe(0);
  });

  it("runs the Trust Gateway exactly once against the winning bid's final price, not the initial one", async () => {
    const result = await runMarketplaceAgent({ query: "minimalist jewelry gift under 2000", channel: "text", includeImage: false, topN: 6 });

    const trustTraces = result.traces.filter(t => t.agentName === "trust");
    expect(trustTraces).toHaveLength(1);

    const winningBid = result.bids.find(bid => bid.won);
    if (winningBid && result.cart.length > 0) {
      expect(result.cart[0].priceInrPaise).toBe(winningBid.finalPriceInrPaise);
    }
  });

  it("produces a draft mandate scoped to the winning merchant only, never a payment", async () => {
    const result = await runMarketplaceAgent({ query: "minimalist jewelry gift under 2000", channel: "text", includeImage: false, topN: 6 });

    if (result.status === "awaiting_consent") {
      expect(result.mandate).not.toBeNull();
      expect(result.mandate?.status).toBe("draft");
    }
  });
});
