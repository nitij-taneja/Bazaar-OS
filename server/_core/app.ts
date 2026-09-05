import "dotenv/config";
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}
import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./vite";
import { databaseWebhookStore, processRazorpayWebhook } from "../paymentWebhook";

/**
 * Builds the Express app shared by the local standalone server
 * (server/_core/index.ts, which additionally wires up Vite's dev middleware)
 * and the Vercel serverless entry (api/index.ts). Static asset serving is
 * skipped on Vercel: the build's dist/public output is served directly by
 * Vercel's CDN via vercel.json, not by this function.
 */
export async function createApp(): Promise<Express> {
  const app = express();

  app.post("/api/webhooks/razorpay", express.raw({ type: "application/json", limit: "1mb" }), async (req, res) => {
    try {
      const signature = req.header("x-razorpay-signature") ?? undefined;
      const eventId = req.header("x-razorpay-event-id") ?? undefined;
      const outcome = await processRazorpayWebhook({ rawBody: req.body as Buffer, signature, secret: process.env.RAZORPAY_WEBHOOK_SECRET, headerEventId: eventId }, databaseWebhookStore);
      res.status(outcome.status).json(outcome);
    } catch (error) {
      console.error("[Razorpay webhook] Processing failed", error);
      res.status(500).json({ accepted: false, reason: "internal_processing_error" });
    }
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Local dev wires up Vite's dev middleware itself (see server/_core/index.ts);
  // Vercel serves dist/public directly via its CDN, not through this function.
  if (!process.env.VERCEL && process.env.NODE_ENV !== "development") {
    serveStatic(app);
  }

  return app;
}
