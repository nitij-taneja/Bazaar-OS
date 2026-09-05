import { describe, expect, it } from "vitest";
import { scoreProductAgainstIntent, runCommerceAgent, loadCatalog } from "./bazaar";
import { toggleProductSponsorship } from "./merchantCatalog";

const baseProduct = {
  id: 999,
  title: "Minimalist Black Watch",
  brand: "Test Brand",
  description: "An elegant minimalist black watch",
  imageUrl: null,
  sourcePriceUsdCents: 1000,
  features: [],
  sourceDetails: {},
  testPriceInrPaise: 200000,
  testInventory: 5,
  deliveryCities: ["Delhi"],
  deliveryEtaText: "2 days",
  styleTags: ["minimal", "black"],
  occasionTags: ["gift"],
  overlayLabel: "test overlay",
  overlayRationale: "test",
  isSponsored: true,
  sponsorBoost: 0.3,
  sourceName: "test",
  sourceUrl: "https://example.com",
  factRows: [],
};

describe("sponsor ad budget gating (pure scoring)", () => {
  it("applies the sponsor boost while the listing's ad budget has remaining balance", () => {
    const product = { ...baseProduct, sponsorBudgetInrPaise: 1000, sponsorSpentInrPaise: 0 };
    const result = scoreProductAgainstIntent(product, "minimalist black watch", { styles: ["minimal"], occasions: ["gift"] }, undefined, null, new Map());
    expect(result.sponsorBoostApplied).toBeGreaterThan(0);
  });

  it("withholds the sponsor boost once the listing's ad budget is fully spent", () => {
    const product = { ...baseProduct, sponsorBudgetInrPaise: 1000, sponsorSpentInrPaise: 1000 };
    const result = scoreProductAgainstIntent(product, "minimalist black watch", { styles: ["minimal"], occasions: ["gift"] }, undefined, null, new Map());
    expect(result.sponsorBoostApplied).toBe(0);
  });

  it("withholds the sponsor boost when no budget was ever declared", () => {
    const product = { ...baseProduct, sponsorBudgetInrPaise: 0, sponsorSpentInrPaise: 0 };
    const result = scoreProductAgainstIntent(product, "minimalist black watch", { styles: ["minimal"], occasions: ["gift"] }, undefined, null, new Map());
    expect(result.sponsorBoostApplied).toBe(0);
  });
});

describe("sponsor ad budget spend (live DB)", () => {
  it("deducts a real, bounded cost per served sponsored impression and never overdraws the budget", async () => {
    const catalog = await loadCatalog(1);
    const product = catalog[0];
    expect(product).toBeTruthy();

    // A tiny budget — enough for exactly one ₹5 served impression.
    await toggleProductSponsorship({ merchantId: 1, actorUserId: 1, productId: product.id, isSponsored: true, sponsorBoost: 0.3, sponsorBudgetInrPaise: 500 });

    const run = await runCommerceAgent({ query: product.title, channel: "text", includeImage: false, merchantSlug: "novacart", topN: 5 });
    const servedCandidate = run.candidates.find(c => c.id === product.id);

    const refreshed = (await loadCatalog(1)).find(p => p.id === product.id)!;
    expect(refreshed.sponsorSpentInrPaise).toBeLessThanOrEqual(500);

    if (servedCandidate?.reasons.some(reason => reason.includes("Sponsored placement"))) {
      expect(refreshed.sponsorSpentInrPaise).toBe(500);
    }

    // Clean up so this test doesn't leave the seeded catalog sponsored for other test runs.
    await toggleProductSponsorship({ merchantId: 1, actorUserId: 1, productId: product.id, isSponsored: false });
  });
});
