import { describe, expect, it } from "vitest";

describe("configured Groq credential", () => {
  it("authenticates against the read-only Groq model catalog", async () => {
    const key = process.env.GROQ_API_KEY;
    expect(key, "GROQ_API_KEY must be configured").toBeTruthy();
    const response = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${key}` } });
    expect(response.ok, `Groq returned ${response.status}`).toBe(true);
  }, 15_000);
});
