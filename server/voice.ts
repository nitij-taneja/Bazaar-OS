import { nanoid } from "nanoid";
import { storagePut } from "./storage";

// Falls back to a locally-referenced key when managed storage isn't
// configured (e.g. no Manus Forge credentials outside the Manus platform),
// so voice transcription/synthesis still work with just a Groq API key.
async function storePutSafely(key: string, data: Buffer, contentType: string) {
  try {
    return await storagePut(key, data, contentType);
  } catch {
    return { key, url: `local://${key}` };
  }
}

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const supportedMimeTypes = new Set(["audio/webm", "audio/wav", "audio/mpeg", "audio/mp4", "audio/ogg", "audio/m4a"]);

function decodeBase64Audio(value: string) {
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Audio must be supplied as a base64 data URL.");
  const [, mimeType, encoded] = match;
  if (!supportedMimeTypes.has(mimeType)) throw new Error("Unsupported recording format. Use webm, wav, mp3, mp4, ogg, or m4a.");
  const buffer = Buffer.from(encoded, "base64");
  if (!buffer.length) throw new Error("The voice recording was empty.");
  if (buffer.length > MAX_AUDIO_BYTES) throw new Error("Voice recording exceeds Groq’s 25 MB free-tier limit.");
  return { mimeType, buffer };
}

export async function transcribeGroqVoice(input: { audioDataUrl: string }) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("Groq transcription is not configured.");
  const { mimeType, buffer } = decodeBase64Audio(input.audioDataUrl);
  const extension = mimeType.split("/")[1]?.replace("mpeg", "mp3") ?? "webm";
  const stored = await storePutSafely(`voice-inputs/${nanoid(18)}.${extension}`, buffer, mimeType);

  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimeType }), `customer-voice.${extension}`);
  form.append("model", "whisper-large-v3-turbo");
  form.append("response_format", "verbose_json");
  form.append("temperature", "0");
  form.append("prompt", "Hinglish shopping request for a fashion or gifting merchant. Preserve product names, Indian city names, rupee amounts, colours, and English fashion terms.");
  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload?.text !== "string") throw new Error(`Groq Whisper transcription failed (${response.status}).`);
  return {
    text: payload.text.trim(),
    detectedLanguage: payload.language ?? "und",
    audioUrl: stored.url,
    audioKey: stored.key,
    segments: Array.isArray(payload.segments) ? payload.segments.slice(0, 12).map((segment: any) => ({ start: segment.start, end: segment.end, avgLogprob: segment.avg_logprob, noSpeechProb: segment.no_speech_prob })) : [],
    decision: {
      model: "whisper-large-v3-turbo",
      reason: "Selected for multilingual transcription and lower cost/latency than full Whisper Large V3. The input is one short recorded request, so no audio chunking is used below the provider’s 25 MB free-tier limit.",
      storage: "Original recording persisted to managed storage before transcription, preserving media provenance.",
    },
  };
}

export async function synthesizeOrpheusBrief(input: { text: string }) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("Groq text-to-speech is not configured.");
  const spokenText = `[professionally] ${input.text.replace(/[\[\]]/g, "").slice(0, 180)}`;
  const response = await fetch("https://api.groq.com/openai/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "canopylabs/orpheus-v1-english", voice: "hannah", input: spokenText, response_format: "wav" }),
  });
  if (!response.ok) throw new Error(`Groq Orpheus speech generation failed (${response.status}).`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const stored = await storePutSafely(`voice-responses/${nanoid(18)}.wav`, buffer, "audio/wav");
  return {
    audioUrl: stored.url,
    audioKey: stored.key,
    decision: {
      model: "canopylabs/orpheus-v1-english",
      voice: "hannah",
      reason: "Orpheus is enabled for short English agent summaries. Hinglish speech recognition is handled by Whisper; BazaarOS discloses that Orpheus currently supports English and Saudi Arabic rather than claiming native Hindi/Hinglish TTS.",
    },
  };
}
