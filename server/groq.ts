import { z } from "zod";

const GroqIntentSchema = z.object({
  normalizedQuery: z.string().min(1).max(280),
  styleTerms: z.array(z.string().min(1).max(30)).max(6),
  occasionTerms: z.array(z.string().min(1).max(30)).max(4),
  customerLanguage: z.enum(["hinglish", "english", "other"]),
  confidence: z.number().min(0).max(1),
});

export type GroqIntent = z.infer<typeof GroqIntentSchema>;

const SYSTEM_PROMPT = `You extract non-financial shopping preferences from a customer message. The message may be Hindi-English Hinglish. Return JSON only with normalizedQuery, styleTerms, occasionTerms, customerLanguage, confidence. Never invent a price, delivery promise, stock quantity, merchant, payment authority, or product. Do not convert preference into a checkout action.`;

export async function extractGroqIntent(query: string): Promise<{ value: GroqIntent | null; model: string | null; reason: string }> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { value: null, model: null, reason: "Groq key is not configured; deterministic intent parser used." };
  const model = process.env.GROQ_MODEL ?? "openai/gpt-oss-20b";
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: query.slice(0, 800) },
        ],
      }),
    });
    if (!response.ok) return { value: null, model: null, reason: `Groq request returned ${response.status}; deterministic parser used.` };
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    const raw = typeof content === "string" ? JSON.parse(content) : null;
    const candidate = raw && typeof raw === "object" ? {
      normalizedQuery: typeof raw.normalizedQuery === "string" ? raw.normalizedQuery : "",
      styleTerms: Array.isArray(raw.styleTerms) ? raw.styleTerms.filter((term: unknown): term is string => typeof term === "string") : [],
      occasionTerms: Array.isArray(raw.occasionTerms) ? raw.occasionTerms.filter((term: unknown): term is string => typeof term === "string") : [],
      customerLanguage: (() => {
        const language = String(raw.customerLanguage ?? "other").toLowerCase();
        return language === "hindi-english" || language === "hindi english" || language === "hindi" ? "hinglish" : language;
      })(),
      confidence: Number(raw.confidence),
    } : null;
    const parsed = GroqIntentSchema.safeParse(candidate);
    if (!parsed.success) return { value: null, model: null, reason: "Groq response did not satisfy BazaarOS’s typed intent contract; deterministic parser used." };
    return { value: parsed.data, model, reason: "Groq returned a valid typed preference extraction. Deterministic code retains all price, delivery, inventory, and payment gates." };
  } catch {
    return { value: null, model: null, reason: "Groq request failed or returned malformed JSON; deterministic parser used." };
  }
}
