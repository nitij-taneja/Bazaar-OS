import { createHash } from "node:crypto";

const HUGGINGFACE_MODEL = "BAAI/bge-small-en-v1.5";
const HUGGINGFACE_ENDPOINT = `https://router.huggingface.co/hf-inference/models/${HUGGINGFACE_MODEL}`;
const GEMINI_MODEL = "gemini-embedding-001";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:batchEmbedContents`;
const GEMINI_OUTPUT_DIMENSIONS = 768;

// Provider is resolved once at startup: Hugging Face when a key is present
// (kept for anyone who has one), otherwise Google Gemini's embedding model
// (real semantic embeddings, reusing the same GEMINI_API_KEY already used
// for vision) -- never a fake/hash-based vector. If neither key is set,
// embedQuery/embedDocuments throw and callers fall back to lexical-only
// ranking, exactly as they already did when Hugging Face was unreachable.
export const EMBEDDING_MODEL = process.env.HUGGINGFACE_API_KEY ? HUGGINGFACE_MODEL : GEMINI_MODEL;

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
    throw new Error("Embedding provider returned an invalid vector.");
  }
  return value;
}

async function requestHuggingFaceEmbeddings(inputs: string[]): Promise<number[][]> {
  const token = process.env.HUGGINGFACE_API_KEY;
  if (!token) throw new Error("Hugging Face embedding route is not configured.");
  const response = await fetch(HUGGINGFACE_ENDPOINT, {
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

async function requestGeminiEmbeddings(inputs: string[]): Promise<number[][]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini embedding route is not configured.");
  const requests = inputs.map(text => ({
    model: `models/${GEMINI_MODEL}`,
    content: { parts: [{ text }] },
    taskType: "SEMANTIC_SIMILARITY",
    outputDimensionality: GEMINI_OUTPUT_DIMENSIONS,
  }));
  const response = await fetch(`${GEMINI_ENDPOINT}?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requests }),
  });
  if (!response.ok) throw new Error(`Gemini embedding request failed with ${response.status}.`);
  const payload = await response.json();
  const embeddings = payload?.embeddings;
  if (!Array.isArray(embeddings) || embeddings.length !== inputs.length) throw new Error("Gemini returned an unexpected embedding batch size.");
  return embeddings.map((item: { values?: unknown }) => validateVector(item?.values));
}

async function requestEmbeddings(inputs: string[]): Promise<number[][]> {
  if (process.env.HUGGINGFACE_API_KEY) return requestHuggingFaceEmbeddings(inputs);
  if (process.env.GEMINI_API_KEY) return requestGeminiEmbeddings(inputs);
  throw new Error("No embedding provider is configured (set HUGGINGFACE_API_KEY or GEMINI_API_KEY).");
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
