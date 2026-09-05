import { describe, expect, it, vi } from "vitest";
import { extractGroqIntent } from "./groq";

describe("Groq structured intent service", () => {
  it("uses the typed Groq response only for non-financial preference extraction", async () => {
    const originalFetch = global.fetch;
    process.env.GROQ_API_KEY = "test-key";
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ normalizedQuery: "minimal black birthday watch", styleTerms: ["minimal", "black"], occasionTerms: ["birthday"], customerLanguage: "hinglish", confidence: 0.92 }) } }] }) }) as unknown as typeof fetch;
    const result = await extractGroqIntent("Mujhe black minimal watch chahiye");
    expect(result.value).toMatchObject({ styleTerms: ["minimal", "black"], occasionTerms: ["birthday"] });
    expect(result.reason).toContain("Deterministic code retains all price");
    global.fetch = originalFetch;
  });
});
