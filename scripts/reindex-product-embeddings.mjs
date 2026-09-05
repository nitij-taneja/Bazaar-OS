import "dotenv/config";
import { createHash } from "node:crypto";
import { createClient } from "@libsql/client";

const model = "BAAI/bge-small-en-v1.5";
const endpoint = `https://router.huggingface.co/hf-inference/models/${model}`;
const token = process.env.HUGGINGFACE_API_KEY;

const url = process.env.DATABASE_URL || "file:./local.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;

if (!token) throw new Error("HUGGINGFACE_API_KEY is required.");

const sha256 = value => createHash("sha256").update(value).digest("hex");
const db = createClient(authToken ? { url, authToken } : { url });
const { rows: products } = await db.execute("SELECT id, catalogDocument FROM products ORDER BY id");
const { rows: stored } = await db.execute({ sql: "SELECT productId, inputSha256 FROM productEmbeddings WHERE model = ?", args: [model] });
const storedByProduct = new Map(stored.map(row => [row.productId, row.inputSha256]));
const pending = products.filter(product => storedByProduct.get(product.id) !== sha256(product.catalogDocument));

async function embed(inputs) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ inputs, normalize: true, truncate: true }),
  });
  if (!response.ok) throw new Error(`Embedding request failed with ${response.status}: ${await response.text()}`);
  const payload = await response.json();
  const vectors = inputs.length === 1 && Array.isArray(payload?.[0]) === false ? [payload] : payload;
  if (!Array.isArray(vectors) || vectors.length !== inputs.length) throw new Error("Unexpected embedding response shape.");
  return vectors;
}

for (let offset = 0; offset < pending.length; offset += 8) {
  const batch = pending.slice(offset, offset + 8);
  const vectors = await embed(batch.map(product => product.catalogDocument));
  for (let index = 0; index < batch.length; index += 1) {
    const product = batch[index];
    const vector = vectors[index];
    if (!Array.isArray(vector) || !vector.length || !vector.every(value => typeof value === "number" && Number.isFinite(value))) throw new Error(`Invalid vector for product ${product.id}.`);
    await db.execute({
      sql: `INSERT INTO productEmbeddings (productId, model, dimensions, inputSha256, vector, normalized)
            VALUES (?, ?, ?, ?, ?, true)
            ON CONFLICT(productId, model) DO UPDATE SET dimensions = excluded.dimensions, inputSha256 = excluded.inputSha256, vector = excluded.vector, normalized = true, generatedAt = unixepoch()`,
      args: [product.id, model, vector.length, sha256(product.catalogDocument), JSON.stringify(vector)],
    });
  }
  console.log(`Indexed ${Math.min(offset + batch.length, pending.length)}/${pending.length} changed documents.`);
}

console.log(`Embedding index ready. ${pending.length} products generated; ${products.length - pending.length} already current.`);
db.close();
