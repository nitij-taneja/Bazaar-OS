import { createHash } from "node:crypto";

export const EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5";
const EMBEDDING_ENDPOINT = `https://router.huggingface.co/hf-inference/models/${EMBEDDING_MODEL}`;
const QUERY_CACHE_TTL_MS = 60_000;
const queryVectorCache = new Map<string, { expiresAt: number; vector: number[] }>();

export type EmbeddingResult = {
  vector: number[];
  cache: "hit" | "miss";
  model: string;
  dimensions: number;
};

export function embeddingInputSha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function validateVector(value: unknown): number[] {
  if (!Array.isArray(value) || value.length === 0 || !value.every(item => typeof item === "number" && Number.isFinite(item))) {
    throw new Error("Hugging Face returned an invalid embedding vector.");
  }
  return value;
}

async function requestEmbeddings(inputs: string[]) {
  const token = process.env.HUGGINGFACE_API_KEY;
  if (!token) throw new Error("Hugging Face embedding route is not configured.");
  const response = await fetch(EMBEDDING_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ inputs, normalize: true, truncate: true }),
  });
  if (!response.ok) throw new Error(`Hugging Face embedding request failed with ${response.status}.`);
  const payload = await response.json();
  if (!Array.isArray(payload)) throw new Error("Hugging Face embedding response is not an array.");
  const vectors = inputs.length === 1 && payload.length && typeof payload[0] === "number" ? [payload] : payload;
  if (vectors.length !== inputs.length) throw new Error("Hugging Face returned an unexpected embedding batch size.");
  return vectors.map(validateVector);
}

export async function embedDocuments(inputs: string[]) {
  if (!inputs.length) return [];
  return requestEmbeddings(inputs);
}

export async function embedQuery(query: string): Promise<EmbeddingResult> {
  const key = `${EMBEDDING_MODEL}:${query.trim().toLowerCase()}`;
  const cached = queryVectorCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return { vector: cached.vector, cache: "hit", model: EMBEDDING_MODEL, dimensions: cached.vector.length };
  const [vector] = await requestEmbeddings([query]);
  queryVectorCache.set(key, { vector, expiresAt: Date.now() + QUERY_CACHE_TTL_MS });
  return { vector, cache: "miss", model: EMBEDDING_MODEL, dimensions: vector.length };
}

export function cosineSimilarity(left: number[], right: number[]) {
  if (left.length !== right.length || !left.length) return 0;
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }
  const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
  return denominator ? dot / denominator : 0;
}

export function clearEmbeddingQueryCache() {
  queryVectorCache.clear();
}
