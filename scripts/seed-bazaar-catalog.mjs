import "dotenv/config";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient } from "@libsql/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.resolve(__dirname, "../data/amazon-fashion-curated.json");

const toEpoch = date => Math.floor(new Date(date).getTime() / 1000);

const testOverlayLabel = "BazaarOS staging operational overlay — not part of the public source dataset";
const cities = ["Delhi", "Mumbai", "Bengaluru", "Pune"];
const styleTerms = ["minimal", "classic", "premium", "giftable", "casual", "formal", "statement"];
const occasionTerms = ["birthday", "gift", "everyday", "work", "festive"];

const inferTags = title => {
  const normalized = title.toLowerCase();
  const styles = styleTerms.filter(tag => normalized.includes(tag)).slice(0, 2);
  if (normalized.includes("watch") || normalized.includes("wallet") || normalized.includes("bag")) styles.push("premium", "giftable");
  if (normalized.includes("black") || normalized.includes("onyx")) styles.push("minimal");
  return [...new Set(styles.length ? styles : ["curated", "giftable"])].slice(0, 4);
};

const inferOccasions = title => {
  const normalized = title.toLowerCase();
  const occasions = occasionTerms.filter(tag => normalized.includes(tag));
  if (normalized.includes("watch") || normalized.includes("jewelry") || normalized.includes("wallet") || normalized.includes("bag")) occasions.push("birthday", "gift");
  return [...new Set(occasions.length ? occasions : ["everyday"])].slice(0, 3);
};

/**
 * Seeds one merchant from the real, public Amazon Reviews'23 catalog. The
 * same real product facts can seed multiple demo merchants with genuinely
 * different operational overlays (price tier, delivery speed) — the honest
 * way to demonstrate multi-merchant comparison without fabricating data.
 */
export async function seedMerchant({
  merchantSlug = "novacart",
  merchantName = "NovaCart",
  merchantDescription = "An AI-transactable lifestyle & fashion merchant enabled by BazaarOS gateway.",
  priceMultiplier = 8300, // INR per source USD
  deliveryEtaText = "Next-day in demo service areas",
  productLimit,
  client,
} = {}) {
  const catalog = JSON.parse(await readFile(dataPath, "utf8"));
  if (productLimit) catalog.products = catalog.products.slice(0, productLimit);

  const tx = await client.transaction("write");
  try {
    const merchantRows = await tx.execute({ sql: "SELECT id FROM merchants WHERE slug = ? LIMIT 1", args: [merchantSlug] });
    let merchantId = merchantRows.rows[0]?.id;
    if (!merchantId) {
      const insert = await tx.execute({
        sql: "INSERT INTO merchants (ownerId, name, slug, description, defaultCurrency) VALUES (?, ?, ?, ?, ?)",
        args: [1, merchantName, merchantSlug, merchantDescription, "INR"],
      });
      merchantId = Number(insert.lastInsertRowid);
    }

    const sourceRows = await tx.execute({ sql: "SELECT id FROM catalogSources WHERE merchantId = ? AND sourceUrl = ? LIMIT 1", args: [merchantId, catalog.source.url] });
    let catalogSourceId = sourceRows.rows[0]?.id;
    if (!catalogSourceId) {
      const insert = await tx.execute({
        sql: "INSERT INTO catalogSources (merchantId, name, publisher, sourceUrl, retrievedAt, sourceNotes) VALUES (?, ?, ?, ?, ?, ?)",
        args: [merchantId, "Amazon Reviews'23 — Amazon Fashion metadata", "McAuley Lab, UC San Diego", catalog.source.url, toEpoch(catalog.generatedAt), "Public metadata source. Product title, source price, image URL, features, description, details and bought-together links are imported as source facts. Test currency, inventory, and delivery commitments are separate staging overlays."],
      });
      catalogSourceId = Number(insert.lastInsertRowid);
    }

    for (const [position, item] of catalog.products.entries()) {
      const sourcePriceUsdCents = Math.round(item.priceUsd * 100);
      await tx.execute({
        sql: `INSERT INTO products (merchantId, catalogSourceId, sourceProductId, title, brand, description, features, sourceDetails, sourceImageUrl, sourcePriceUsdCents, sourceAverageRating, sourceRatingCount, boughtTogetherIds, catalogDocument, documentSha256)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(merchantId, sourceProductId) DO UPDATE SET title = excluded.title, brand = excluded.brand, description = excluded.description, features = excluded.features, sourceDetails = excluded.sourceDetails, sourceImageUrl = excluded.sourceImageUrl, sourcePriceUsdCents = excluded.sourcePriceUsdCents, boughtTogetherIds = excluded.boughtTogetherIds, catalogDocument = excluded.catalogDocument, documentSha256 = excluded.documentSha256`,
        args: [merchantId, catalogSourceId, item.sourceProductId, item.title, item.brand, item.description || null, JSON.stringify(item.features), JSON.stringify(item.details), item.sourceImageUrl, sourcePriceUsdCents, null, null, JSON.stringify(item.boughtTogether), item.catalogDocument, item.catalogDocumentSha256],
      });

      const productRows = await tx.execute({ sql: "SELECT id FROM products WHERE merchantId = ? AND sourceProductId = ? LIMIT 1", args: [merchantId, item.sourceProductId] });
      const productId = productRows.rows[0].id;
      const testPriceInrPaise = Math.max(49900, Math.round(item.priceUsd * priceMultiplier));
      const testInventory = 4 + (position % 9);
      const tags = inferTags(item.title);
      const occasions = inferOccasions(item.title);

      await tx.execute({
        sql: `INSERT INTO productOperationalOverlays (productId, testPriceInrPaise, testInventory, deliveryCities, deliveryEtaText, styleTags, occasionTags, overlayLabel, overlayRationale, isActive)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true)
         ON CONFLICT(productId) DO UPDATE SET testPriceInrPaise = excluded.testPriceInrPaise, testInventory = excluded.testInventory, deliveryCities = excluded.deliveryCities, deliveryEtaText = excluded.deliveryEtaText, styleTags = excluded.styleTags, occasionTags = excluded.occasionTags, overlayLabel = excluded.overlayLabel, overlayRationale = excluded.overlayRationale, isActive = excluded.isActive`,
        args: [productId, testPriceInrPaise, testInventory, JSON.stringify(cities), deliveryEtaText, JSON.stringify(tags), JSON.stringify(occasions), testOverlayLabel, `Test price uses a documented USD-to-INR staging conversion of ₹${(priceMultiplier / 100).toFixed(2)} per public-source USD. Inventory and delivery are deterministic staging values used only to demonstrate bounded Razorpay test-mode commerce.`],
      });

      const facts = [
        ["title", item.title, "source", "Amazon Reviews'23: title", "verified_source"],
        ["source_price_usd", `$${item.priceUsd.toFixed(2)}`, "source", "Amazon Reviews'23: price", "verified_source"],
        ["image", item.sourceImageUrl, "source", "Amazon Reviews'23: images[0]", "verified_source"],
        ["features", item.features.join("; ") || "No source feature bullets supplied", "source", "Amazon Reviews'23: features", "verified_source"],
        ["test_price_inr", `₹${(testPriceInrPaise / 100).toFixed(2)}`, "operational_overlay", "BazaarOS test-price conversion", "deterministic_overlay"],
        ["test_inventory", String(testInventory), "operational_overlay", "BazaarOS staging inventory", "deterministic_overlay"],
        ["delivery", `${deliveryEtaText} — ${cities.join(", ")}`, "operational_overlay", "BazaarOS staging delivery policy", "deterministic_overlay"],
        ["style_tags", tags.join(", "), "inference", "Deterministic title-to-tag rules", "rule_based"],
      ];

      for (const [factKey, factValue, factKind, sourcePointer, confidence] of facts) {
        await tx.execute({
          sql: `INSERT INTO productFacts (productId, factKey, factValue, factKind, sourcePointer, confidence)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(productId, factKey, factKind) DO UPDATE SET factValue = excluded.factValue, sourcePointer = excluded.sourcePointer, confidence = excluded.confidence`,
          args: [productId, factKey, factValue, factKind, sourcePointer, confidence],
        });
      }
    }

    const allProductsResult = await tx.execute({ sql: "SELECT id, title FROM products WHERE merchantId = ? ORDER BY id ASC", args: [merchantId] });
    const allProducts = allProductsResult.rows;
    for (let index = 0; index < allProducts.length; index += 2) {
      const primary = allProducts[index];
      const accessory = allProducts[(index + 1) % allProducts.length];
      const rationale = "Transparent staging bundle: a complementary catalog item is shown as optional and requires explicit customer acceptance.";
      await tx.execute({
        sql: `INSERT INTO productBundles (primaryProductId, accessoryProductId, rationale, confidence)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(primaryProductId, accessoryProductId) DO UPDATE SET rationale = excluded.rationale, confidence = excluded.confidence`,
        args: [primary.id, accessory.id, rationale, "staged"],
      });
    }

    const eventPayload = {
      source: catalog.source,
      productCount: catalog.products.length,
      overlayLabel: testOverlayLabel,
    };
    await tx.execute({
      sql: "INSERT INTO auditEvents (merchantId, eventType, actorType, payload, integrityHash) VALUES (?, ?, ?, ?, ?)",
      args: [merchantId, "catalog.seeded", "system", JSON.stringify(eventPayload), createHash("sha256").update(JSON.stringify(eventPayload)).digest("hex")],
    });

    await tx.commit();
    console.log(`Seeded ${catalog.products.length} public-source catalog items for merchant "${merchantName}" (slug: ${merchantSlug}, id: ${merchantId}).`);
    return { merchantId, productCount: catalog.products.length };
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

// CLI entry point: reads configuration from environment variables so
// `pnpm db:seed` keeps working unchanged. For seeding all three demo
// merchants at once, use `pnpm db:seed:demo` instead.
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.DATABASE_URL || "file:./local.db";
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  const client = createClient(authToken ? { url, authToken } : { url });
  try {
    await seedMerchant({
      merchantSlug: process.env.MERCHANT_SLUG,
      merchantName: process.env.MERCHANT_NAME,
      merchantDescription: process.env.MERCHANT_DESCRIPTION,
      priceMultiplier: process.env.PRICE_MULTIPLIER ? Number(process.env.PRICE_MULTIPLIER) : undefined,
      deliveryEtaText: process.env.DELIVERY_ETA_TEXT,
      productLimit: process.env.PRODUCT_LIMIT ? Number(process.env.PRODUCT_LIMIT) : undefined,
      client,
    });
  } finally {
    client.close();
  }
}
