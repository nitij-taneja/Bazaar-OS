import "dotenv/config";
import { createClient } from "@libsql/client";
import { seedMerchant } from "./seed-bazaar-catalog.mjs";

// Seeds a 12-merchant marketplace from the same real Amazon Reviews'23
// catalog — 300 real products (pulled via a byte-range fetch of the public
// dataset and filtered with the same quality rules as the original 26-item
// curation: real title, real price, real image, fashion/gift-relevant).
// Each merchant gets a large, mostly-distinct slice with a deliberate
// partial overlap against its neighbors (a ~15-of-40 product overlap band)
// — real sellers legitimately competing on the same real items ("Buy Box"
// competition), plus plenty of items unique to each merchant. Honest
// scale-up, no fabricated data. Run once: `pnpm db:seed:demo`.
export const MERCHANTS = [
  {
    merchantSlug: "novacart",
    merchantName: "NovaCart",
    merchantDescription: "An AI-transactable lifestyle & fashion merchant enabled by BazaarOS gateway. The platform's flagship, broadest catalog.",
    priceMultiplier: 8300,
    deliveryEtaText: "Next-day in demo service areas",
    productLimit: 80,
    productOffset: 0,
  },
  {
    merchantSlug: "aurelia-premium",
    merchantName: "Aurelia Premium",
    merchantDescription: "A premium-positioned lifestyle retailer: higher-tier pricing, curated selection, slower delivery.",
    priceMultiplier: 10800,
    deliveryEtaText: "3-4 business days (curated packaging)",
    productLimit: 40,
    productOffset: 25,
  },
  {
    merchantSlug: "quickbazaar-express",
    merchantName: "QuickBazaar Express",
    merchantDescription: "A delivery-speed-focused retailer: same/next-day fulfillment, competitive pricing.",
    priceMultiplier: 7600,
    deliveryEtaText: "Same-day dispatch, next-morning delivery",
    productLimit: 40,
    productOffset: 50,
  },
  {
    merchantSlug: "valuemart-bazaar",
    merchantName: "ValueMart Bazaar",
    merchantDescription: "A discount-focused retailer: the lowest prices on the platform, standard shipping speed.",
    priceMultiplier: 6800,
    deliveryEtaText: "5-7 business days (standard shipping)",
    productLimit: 40,
    productOffset: 75,
  },
  {
    merchantSlug: "ecostyle-collective",
    merchantName: "EcoStyle Collective",
    merchantDescription: "A sustainability-positioned retailer: consolidated eco-shipping, mid-tier pricing.",
    priceMultiplier: 8800,
    deliveryEtaText: "2-3 business days (consolidated eco-shipping)",
    productLimit: 40,
    productOffset: 100,
  },
  {
    merchantSlug: "urbantrend-hub",
    merchantName: "UrbanTrend Hub",
    merchantDescription: "A trend-forward retailer for younger buyers: competitive pricing, fast delivery.",
    priceMultiplier: 7900,
    deliveryEtaText: "Next-day delivery",
    productLimit: 40,
    productOffset: 125,
  },
  {
    merchantSlug: "heritagecraft-traders",
    merchantName: "HeritageCraft Traders",
    merchantDescription: "An artisanal/traditional-craft positioned retailer: made-to-order, premium pricing.",
    priceMultiplier: 11500,
    deliveryEtaText: "4-6 business days (handcrafted, made to order)",
    productLimit: 40,
    productOffset: 150,
  },
  {
    merchantSlug: "metrodeals-wholesale",
    merchantName: "MetroDeals Wholesale",
    merchantDescription: "A bulk/wholesale-positioned retailer: the platform's lowest wholesale pricing, slower warehouse dispatch.",
    priceMultiplier: 6500,
    deliveryEtaText: "6-8 business days (bulk warehouse dispatch)",
    productLimit: 40,
    productOffset: 175,
  },
  {
    merchantSlug: "glowup-essentials",
    merchantName: "GlowUp Essentials",
    merchantDescription: "A lifestyle/gifting-niche retailer: mid-to-premium pricing, reliable 2-day delivery.",
    priceMultiplier: 9200,
    deliveryEtaText: "2-day delivery",
    productLimit: 40,
    productOffset: 200,
  },
  {
    merchantSlug: "swiftcart-direct",
    merchantName: "SwiftCart Direct",
    merchantDescription: "A direct-to-consumer retailer optimized for metro same-day delivery at competitive prices.",
    priceMultiplier: 8100,
    deliveryEtaText: "Same-day delivery in metro areas",
    productLimit: 40,
    productOffset: 225,
  },
  {
    merchantSlug: "luxelane-boutique",
    merchantName: "LuxeLane Boutique",
    merchantDescription: "The platform's luxury boutique: highest-tier pricing, white-glove curated delivery.",
    priceMultiplier: 13000,
    deliveryEtaText: "5-7 business days (white-glove delivery)",
    productLimit: 40,
    productOffset: 250,
  },
  {
    merchantSlug: "everydaybasics-co",
    merchantName: "EverydayBasics Co",
    merchantDescription: "A no-frills basics retailer: the platform's lowest prices, standard delivery.",
    priceMultiplier: 6200,
    deliveryEtaText: "3-5 business days",
    productLimit: 40,
    productOffset: 275,
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
