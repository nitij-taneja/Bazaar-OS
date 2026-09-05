import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { checkoutOrders, paymentEvents } from "../drizzle/schema";
import { getDb } from "./db";

export type PaymentWebhookStore = {
  findEvent(provider: string, providerEventId: string): Promise<boolean>;
  insertEvent(event: {
    checkoutOrderId: number | null;
    provider: string;
    providerEventId: string;
    eventType: string;
    signatureVerified: boolean;
    replayDisposition: "accepted" | "duplicate" | "rejected";
    payloadHash: string;
    payloadMetadata: Record<string, unknown>;
  }): Promise<void>;
  findOrderByProviderOrderId(providerOrderId: string): Promise<number | null>;
  updateOrderStatus(orderId: number, status: "paid" | "failed" | "pending", failure?: { code?: string; message?: string }): Promise<void>;
};

export function calculateRazorpaySignature(rawBody: Buffer, secret: string) {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifyRazorpaySignature(rawBody: Buffer, signature: string | undefined, secret: string | undefined) {
  if (!secret) return { valid: false, reason: "webhook_secret_not_configured" as const };
  if (!signature) return { valid: false, reason: "signature_missing" as const };
  const expected = calculateRazorpaySignature(rawBody, secret);
  const expectedBuffer = Buffer.from(expected, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");
  if (expectedBuffer.length !== signatureBuffer.length) return { valid: false, reason: "signature_invalid" as const };
  return timingSafeEqual(expectedBuffer, signatureBuffer)
    ? { valid: true as const }
    : { valid: false, reason: "signature_invalid" as const };
}

function extractOrderId(payload: Record<string, any>) {
  return payload?.payload?.payment?.entity?.order_id ?? payload?.payload?.order?.entity?.id ?? null;
}

function extractFailure(payload: Record<string, any>) {
  const payment = payload?.payload?.payment?.entity;
  return {
    code: typeof payment?.error_code === "string" ? payment.error_code : undefined,
    message: typeof payment?.error_description === "string" ? payment.error_description : undefined,
  };
}

export function deriveProviderEventId(payload: Record<string, any>, headerEventId?: string) {
  if (headerEventId) return headerEventId;
  const providerOrderId = extractOrderId(payload);
  const paymentId = payload?.payload?.payment?.entity?.id;
  const eventType = typeof payload?.event === "string" ? payload.event : "unknown";
  const createdAt = payload?.created_at ?? "unknown";
  return `derived_${createHash("sha256").update(`${eventType}:${paymentId ?? providerOrderId ?? "unknown"}:${createdAt}`).digest("hex")}`;
}

export async function processRazorpayWebhook(input: { rawBody: Buffer; signature?: string; secret?: string; headerEventId?: string }, store: PaymentWebhookStore) {
  const verification = verifyRazorpaySignature(input.rawBody, input.signature, input.secret);
  if (!verification.valid) return { accepted: false as const, status: 401, reason: verification.reason };

  let payload: Record<string, any>;
  try {
    payload = JSON.parse(input.rawBody.toString("utf8"));
  } catch {
    return { accepted: false as const, status: 400, reason: "invalid_json" as const };
  }

  const eventType = typeof payload.event === "string" ? payload.event : "unknown";
  const providerEventId = deriveProviderEventId(payload, input.headerEventId);
  const payloadHash = createHash("sha256").update(input.rawBody).digest("hex");
  if (await store.findEvent("razorpay", providerEventId)) {
    // The original verified provider event is the canonical persistence record.
    // Do not insert a synthetic duplicate record: repeated webhook delivery must be
    // safe an unlimited number of times under the unique provider-event constraint.
    return { accepted: true as const, status: 200, duplicate: true as const, providerEventId };
  }

  const providerOrderId = extractOrderId(payload);
  const checkoutOrderId = providerOrderId ? await store.findOrderByProviderOrderId(providerOrderId) : null;
  await store.insertEvent({
    checkoutOrderId,
    provider: "razorpay",
    providerEventId,
    eventType,
    signatureVerified: true,
    replayDisposition: "accepted",
    payloadHash,
    payloadMetadata: { providerOrderId, eventCreatedAt: payload.created_at ?? null, eventIdWasHeaderSupplied: Boolean(input.headerEventId) },
  });

  if (checkoutOrderId) {
    if (eventType === "payment.captured" || eventType === "order.paid") await store.updateOrderStatus(checkoutOrderId, "paid");
    if (eventType.includes("failed")) await store.updateOrderStatus(checkoutOrderId, "failed", extractFailure(payload));
  }
  return { accepted: true as const, status: 200, duplicate: false as const, providerEventId };
}

export const databaseWebhookStore: PaymentWebhookStore = {
  async findEvent(provider, providerEventId) {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable for webhook processing.");
    const existing = await db.select({ id: paymentEvents.id }).from(paymentEvents).where(eq(paymentEvents.providerEventId, providerEventId)).limit(1);
    return Boolean(existing[0]);
  },
  async insertEvent(event) {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable for webhook processing.");
    await db.insert(paymentEvents).values(event);
  },
  async findOrderByProviderOrderId(providerOrderId) {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable for webhook processing.");
    const result = await db.select({ id: checkoutOrders.id }).from(checkoutOrders).where(eq(checkoutOrders.providerOrderId, providerOrderId)).limit(1);
    return result[0]?.id ?? null;
  },
  async updateOrderStatus(orderId, status, failure) {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable for webhook processing.");
    await db.update(checkoutOrders).set({ status, failureCode: failure?.code ?? null, failureMessage: failure?.message ?? null }).where(eq(checkoutOrders.id, orderId));
  },
};
