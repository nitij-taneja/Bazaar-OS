import { describe, expect, it } from "vitest";

describe("configured external credentials", () => {
  it("authenticates against Groq and Razorpay Test Mode read-only endpoints", async () => {
    const groqKey = process.env.GROQ_API_KEY;
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    expect(groqKey).toBeTruthy();
    expect(razorpayKeyId).toMatch(/^rzp_test_/);
    expect(razorpayKeySecret).toBeTruthy();

    const razorpayAuth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64");
    const [groqResponse, razorpayResponse] = await Promise.all([
      fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${groqKey}` } }),
      fetch("https://api.razorpay.com/v1/payments?count=1", { headers: { Authorization: `Basic ${razorpayAuth}` } }),
    ]);

    expect(groqResponse.ok, `Groq returned ${groqResponse.status}`).toBe(true);
    expect(razorpayResponse.ok, `Razorpay Test Mode returned ${razorpayResponse.status}`).toBe(true);
  }, 20_000);
});
