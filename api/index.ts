import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../server/_core/app";
import type { Express } from "express";

// Reused across warm invocations of the same serverless instance so we don't
// rebuild the Express app (and its tRPC router) on every request.
let appPromise: Promise<Express> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!appPromise) appPromise = createApp();
  const app = await appPromise;
  app(req as any, res as any);
}
