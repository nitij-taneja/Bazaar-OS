import { createHmac, timingSafeEqual } from "node:crypto";

type RazorpayOrderResponse = {
  id: string;
  entity: "order";
  amount: number;
  currency: string;
  receipt?: string;
  status: string;
};

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId?.startsWith("rzp_test_") || !keySecret) throw new Error("Razorpay Test Mode credentials are not configured.");
  return { keyId, keySecret };
}

export async function createRazorpayTestOrder(input: { amountInrPaise: number; receipt: string; notes: Record<string, string> }) {
  const { keyId, keySecret } = credentials();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: input.amountInrPaise, currency: "INR", receipt: input.receipt.slice(0, 40), notes: input.notes }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.id) throw new Error(`Razorpay Test Mode order creation failed (${response.status}).`);
  return { order: payload as RazorpayOrderResponse, keyId };
}

export function verifyRazorpayPaymentSignature(input: { orderId: string; paymentId: string; signature: string }) {
  const { keySecret } = credentials();
  const expected = createHmac("sha256", keySecret).update(`${input.orderId}|${input.paymentId}`).digest("hex");
  const actual = Buffer.from(input.signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (actual.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actual, expectedBuffer);
}
