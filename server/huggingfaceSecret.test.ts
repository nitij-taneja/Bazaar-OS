import { describe, expect, it } from "vitest";

describe("configured Hugging Face embedding credential", () => {
  it("authenticates with the Hugging Face account endpoint", async () => {
    const token = process.env.HUGGINGFACE_API_KEY;
    expect(token, "HUGGINGFACE_API_KEY must be configured").toBeTruthy();
    const response = await fetch("https://huggingface.co/api/whoami-v2", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.ok, `Hugging Face returned ${response.status}`).toBe(true);
  }, 15_000);
});
