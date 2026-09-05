import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { commerceRouter } from "./commerceRouter";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    demoLogin: publicProcedure
      .input(z.object({ role: z.enum(["admin", "merchant", "customer", "ai_agent"]).default("admin") }).optional())
      .mutation(async ({ input, ctx }) => {
        const role = input?.role ?? "admin";
        const name = role === "admin" || role === "merchant" ? "NovaCart Admin" : "Demo Customer";
        const email = role === "admin" || role === "merchant" ? "admin@novacart.in" : "customer@example.com";
        const openId = `demo-${role}-1`;

        const token = await sdk.createSessionToken(openId, {
          name,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return {
          success: true,
          token,
          user: { id: 1, openId, name, email, role: "admin" },
        };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  commerce: commerceRouter,
});

export type AppRouter = typeof appRouter;
