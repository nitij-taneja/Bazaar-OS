import { describe, expect, it } from "vitest";
import { transcribeGroqVoice } from "./voice";
import { analyzeStyleReference } from "./vision";

describe("multimodal input safety", () => {
  it("rejects malformed and unsupported voice input before storage or Groq transcription", async () => {
    await expect(transcribeGroqVoice({ audioDataUrl: "not-a-data-url" })).rejects.toThrow("base64 data URL");
    await expect(transcribeGroqVoice({ audioDataUrl: "data:text/plain;base64,aGVsbG8=" })).rejects.toThrow("Unsupported recording format");
  });

  it("rejects malformed and unsupported image references before storage or vision inference", async () => {
    await expect(analyzeStyleReference({ imageDataUrl: "not-a-data-url" })).rejects.toThrow("base64 data URL");
    await expect(analyzeStyleReference({ imageDataUrl: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP" })).rejects.toThrow("JPEG, PNG, or WebP");
  });
});
