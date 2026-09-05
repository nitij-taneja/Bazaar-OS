import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { calculateRazorpaySignature } from "./paymentWebhook";

describe("configured Razorpay webhook secret", () => {
  it("verifies the matching Test Mode HMAC and rejects a forged signature", () => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    expect(secret).toBeTruthy();
    const rawPayload = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_test_configured" } } } });
    const validSignature = createHmac("sha256", secret!).update(rawPayload).digest("hex");
    expect(calculateRazorpaySignature(Buffer.from(rawPayload), secret!)).toBe(validSignature);
    expect(calculateRazorpaySignature(Buffer.from(rawPayload), secret!)).not.toBe("forged-signature");
  });
});
