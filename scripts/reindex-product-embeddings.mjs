import "dotenv/config";
import { createHash } from "node:crypto";
import { createClient } from "@libsql/client";

const HUGGINGFACE_MODEL = "BAAI/bge-small-en-v1.5";
const HUGGINGFACE_ENDPOINT = `https://router.huggingface.co/hf-inference/models/${HUGGINGFACE_MODEL}`;
const GEMINI_MODEL = "gemini-embedding-001";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:batchEmbedContents`;
const GEMINI_OUTPUT_DIMENSIONS = 768;

const hfToken = process.env.HUGGINGFACE_API_KEY;
const geminiKey = process.env.GEMINI_API_KEY;
if (!hfToken && !geminiKey) throw new Error("Set HUGGINGFACE_API_KEY or GEMINI_API_KEY to reindex embeddings.");

// Mirrors server/embeddings.ts: Hugging Face when a key is present, otherwise
// Gemini's real embedding model (reusing the key already used for vision).
const model = hfToken ? HUGGINGFACE_MODEL : GEMINI_MODEL;

const url = process.env.DATABASE_URL || "file:./local.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;

const sha256 = value => createHash("sha256").update(value).digest("hex");
const db = createClient(authToken ? { url, authToken } : { url });
const { rows: products } = await db.execute("SELECT id, catalogDocument FROM products ORDER BY id");
const { rows: stored } = await db.execute({ sql: "SELECT productId, inputSha256 FROM productEmbeddings WHERE model = ?", args: [model] });
const storedByProduct = new Map(stored.map(row => [row.productId, row.inputSha256]));
const pending = products.filter(product => storedByProduct.get(product.id) !== sha256(product.catalogDocument));

function validateVector(value) {
  if (!Array.isArray(value) || !value.length || !value.every(item => typeof item === "number" && Number.isFinite(item))) {
    throw new Error("Embedding provider returned an invalid vector.");
  }
  return value;
}

async function embedHuggingFace(inputs) {
  const response = await fetch(HUGGINGFACE_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ inputs, normalize: true, truncate: true }),
  });
  if (!response.ok) throw new Error(`Hugging Face embedding request failed with ${response.status}: ${await response.text()}`);
  const payload = await response.json();
  const vectors = inputs.length === 1 && Array.isArray(payload?.[0]) === false ? [payload] : payload;
  if (!Array.isArray(vectors) || vectors.length !== inputs.length) throw new Error("Unexpected embedding response shape.");
  return vectors.map(validateVector);
}

async function embedGemini(inputs) {
  const requests = inputs.map(text => ({
    model: `models/${GEMINI_MODEL}`,
    content: { parts: [{ text }] },
    taskType: "SEMANTIC_SIMILARITY",
    outputDimensionality: GEMINI_OUTPUT_DIMENSIONS,
  }));
  const response = await fetch(`${GEMINI_ENDPOINT}?key=${geminiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requests }),
  });
  if (!response.ok) throw new Error(`Gemini embedding request failed with ${response.status}: ${await response.text()}`);
  const payload = await response.json();
  const embeddings = payload?.embeddings;
  if (!Array.isArray(embeddings) || embeddings.length !== inputs.length) throw new Error("Unexpected embedding response shape.");
  return embeddings.map(item => validateVector(item?.values));
}

const embed = hfToken ? embedHuggingFace : embedGemini;

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
  console.log(`Indexed ${Math.min(offset + batch.length, pending.length)}/${pending.length} changed documents (model: ${model}).`);
}

console.log(`Embedding index ready. ${pending.length} products generated; ${products.length - pending.length} already current.`);
db.close();
