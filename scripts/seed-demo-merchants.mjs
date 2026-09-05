import "dotenv/config";
import { createClient } from "@libsql/client";
import { seedMerchant } from "./seed-bazaar-catalog.mjs";

// Seeds three merchants from the same real Amazon Reviews'23 catalog, each
// with a genuinely different operational overlay — the honest way to
// demonstrate cross-merchant comparison: same real product facts, different
// merchant-managed price/delivery strategy. Run once: `pnpm db:seed:demo`.
const MERCHANTS = [
  {
    merchantSlug: "novacart",
    merchantName: "NovaCart",
    merchantDescription: "An AI-transactable lifestyle & fashion merchant enabled by BazaarOS gateway. Balanced pricing and delivery.",
    priceMultiplier: 8300,
    deliveryEtaText: "Next-day in demo service areas",
  },
  {
    merchantSlug: "aurelia-premium",
    merchantName: "Aurelia Premium",
    merchantDescription: "A premium-positioned lifestyle retailer on BazaarOS: higher-tier pricing, curated selection, slower delivery.",
    priceMultiplier: 10800,
    deliveryEtaText: "3-4 business days (curated packaging)",
    productLimit: 14,
  },
  {
    merchantSlug: "quickbazaar-express",
    merchantName: "QuickBazaar Express",
    merchantDescription: "A delivery-speed-focused retailer on BazaarOS: same/next-day fulfillment, competitive pricing.",
    priceMultiplier: 7600,
    deliveryEtaText: "Same-day dispatch, next-morning delivery",
    productLimit: 14,
  },
];

const url = process.env.DATABASE_URL || "file:./local.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;
const client = createClient(authToken ? { url, authToken } : { url });

try {
  for (const config of MERCHANTS) {
    await seedMerchant({ ...config, client });
  }
  console.log(`\nSeeded ${MERCHANTS.length} demo merchants: ${MERCHANTS.map(m => m.merchantSlug).join(", ")}`);
} finally {
  client.close();
}
