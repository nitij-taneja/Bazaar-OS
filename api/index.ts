import type { IncomingMessage, ServerResponse } from "node:http";
import type { Express } from "express";

// Vercel's Node function builder does not bundle this file's local relative
// imports (confirmed live: it threw ERR_MODULE_NOT_FOUND for
// "../server/_core/app" at runtime even though the build itself succeeded).
// To sidestep that entirely, the whole server is pre-bundled into a single
// self-contained file by `pnpm run vercel-build` (see package.json and
// vercel.json's buildCommand) before this function ever runs, so there is no
// local multi-file import left for the runtime to fail on.
let appPromise: Promise<Express> | null = null;

async function loadApp(): Promise<Express> {
  // @ts-ignore -- dist/server-app.mjs is produced by the build step above, not present during local type-checking
  const mod = await import("../dist/server-app.mjs");
  return mod.createApp();
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!appPromise) appPromise = loadApp();
  const app = await appPromise;
  app(req as any, res as any);
}
