import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { calculateRazorpaySignature, processRazorpayWebhook } from "./paymentWebhook";
import { verifyRazorpayPaymentSignature } from "./razorpay";

function createStore() {
  const events: any[] = [];
  const updates: any[] = [];
  return {
    events,
    updates,
    store: {
      findEvent: async (_provider: string, providerEventId: string) => events.some(event => event.providerEventId === providerEventId),
      insertEvent: async (event: any) => { events.push(event); },
      findOrderByProviderOrderId: async (providerOrderId: string) => providerOrderId === "order_test_1" ? 77 : null,
      updateOrderStatus: async (orderId: number, status: string, failure?: any) => { updates.push({ orderId, status, failure }); },
    },
  };
}

describe("Razorpay webhook processing", () => {
  const secret = "webhook_test_secret";
  const rawBody = Buffer.from(JSON.stringify({ event: "payment.captured", created_at: 123, payload: { payment: { entity: { id: "pay_test_1", order_id: "order_test_1" } } } }));

  it("accepts a valid signed event and records a paid order update", async () => {
    const harness = createStore();
    const result = await processRazorpayWebhook({ rawBody, signature: calculateRazorpaySignature(rawBody, secret), secret, headerEventId: "evt_1" }, harness.store);
    expect(result).toMatchObject({ accepted: true, status: 200, duplicate: false, providerEventId: "evt_1" });
    expect(harness.events[0]).toMatchObject({ provider: "razorpay", providerEventId: "evt_1", signatureVerified: true, replayDisposition: "accepted", checkoutOrderId: 77 });
    expect(harness.updates).toEqual([{ orderId: 77, status: "paid", failure: undefined }]);
  });

  it("accepts repeated idempotent duplicates without a second order-state update or collision", async () => {
    const harness = createStore();
    const request = { rawBody, signature: calculateRazorpaySignature(rawBody, secret), secret, headerEventId: "evt_2" };
    await processRazorpayWebhook(request, harness.store);
    const second = await processRazorpayWebhook(request, harness.store);
    const third = await processRazorpayWebhook(request, harness.store);
    expect(second).toMatchObject({ accepted: true, duplicate: true });
    expect(third).toMatchObject({ accepted: true, duplicate: true });
    expect(harness.updates).toHaveLength(1);
    expect(harness.events).toHaveLength(1);
  });

  it("rejects an invalid webhook signature before persisting a payment event", async () => {
    const harness = createStore();
    const result = await processRazorpayWebhook({ rawBody, signature: "not-valid", secret, headerEventId: "evt_bad" }, harness.store);
    expect(result).toMatchObject({ accepted: false, status: 401, reason: "signature_invalid" });
    expect(harness.events).toHaveLength(0);
  });
});

describe("Razorpay checkout response verification", () => {
  it("accepts the exact order-payment HMAC and rejects a forged response", () => {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    expect(secret).toBeTruthy();
    const orderId = "order_test_bound";
    const paymentId = "pay_test_bound";
    const signature = createHmac("sha256", secret!).update(`${orderId}|${paymentId}`).digest("hex");
    expect(verifyRazorpayPaymentSignature({ orderId, paymentId, signature })).toBe(true);
    expect(verifyRazorpayPaymentSignature({ orderId, paymentId, signature: "forged" })).toBe(false);
  });
});
