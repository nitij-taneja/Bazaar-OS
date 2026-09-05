import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const sourcePath = "/home/ubuntu/amazon_fashion_sample.jsonl";
const outputPath = "/home/ubuntu/bazaar-os/data/amazon-fashion-curated.json";
const sourceUrl =
  "https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023/resolve/main/raw/meta_categories/meta_Amazon_Fashion.jsonl";

const categories = ["wallet", "bag", "watch", "belt", "scarf", "jewelry", "sunglasses", "shoes", "shoe", "gift", "accessory"];
const lines = (await readFile(sourcePath, "utf8")).split("\n").filter(Boolean);

const selected = [];
const seen = new Set();

for (const line of lines) {
  let record;
  try {
    record = JSON.parse(line);
  } catch {
    continue;
  }

  const title = String(record.title ?? "").trim();
  const normalized = title.toLowerCase();
  const price = Number(record.price);
  const imageUrl = record.images?.find(image => image?.large || image?.hi_res)?.large ?? record.images?.[0]?.hi_res;

  if (!title || !Number.isFinite(price) || price <= 0 || !imageUrl) continue;
  if (!categories.some(category => normalized.includes(category))) continue;
  if (seen.has(record.parent_asin)) continue;

  seen.add(record.parent_asin);
  const details = record.details ?? {};
  const features = Array.isArray(record.features) ? record.features.filter(Boolean).slice(0, 4) : [];
  const description = Array.isArray(record.description) ? record.description.filter(Boolean).join(" ").slice(0, 800) : "";
  const document = [title, record.store, ...features, description, ...Object.entries(details).map(([key, value]) => `${key}: ${value}`)]
    .filter(Boolean)
    .join(". ");

  selected.push({
    sourceProductId: record.parent_asin,
    title,
    brand: record.store || null,
    priceUsd: price,
    sourceImageUrl: imageUrl,
    averageRating: Number.isFinite(Number(record.average_rating)) ? Number(record.average_rating) : null,
    ratingCount: Number.isFinite(Number(record.rating_number)) ? Number(record.rating_number) : null,
    features,
    description,
    details,
    boughtTogether: Array.isArray(record.bought_together) ? record.bought_together : [],
    catalogDocument: document,
    catalogDocumentSha256: createHash("sha256").update(document).digest("hex"),
    provenance: {
      sourceName: "Amazon Reviews'23 — Amazon Fashion metadata",
      sourcePublisher: "McAuley Lab, UC San Diego",
      sourceUrl,
      retrievedFromByteSample: true,
      sourceFields: ["title", "store", "price", "images", "features", "description", "details", "bought_together", "average_rating", "rating_number"],
      note: "Operational inventory, INR pricing, and delivery eligibility are intentionally not inferred from this public source and must be supplied by a merchant configuration layer."
    }
  });

  if (selected.length === 36) break;
}

if (selected.length < 12) {
  throw new Error(`Only ${selected.length} suitable priced catalog records were found in the source sample.`);
}

await mkdir("/home/ubuntu/bazaar-os/data", { recursive: true });
await writeFile(outputPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: {
    name: "Amazon Reviews'23 — Amazon Fashion metadata",
    url: sourceUrl,
    sampleBytes: 2097152,
    selectionPolicy: "Unique public records with a non-null source price, an image, and a fashion/gifting-relevant title.",
  },
  products: selected,
}, null, 2));

console.log(`Wrote ${selected.length} provenance-labeled products to ${outputPath}`);
