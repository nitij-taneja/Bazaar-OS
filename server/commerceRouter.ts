import { z } from "zod";
import { approveMandate, getDemoOverview, getMerchantFairnessStats, getRecentAgentActivity, listKnownMerchantSlugs, recordComparisonOutcome, runCommerceAgent, runMarketplaceAgent, simulateTestPaymentFailure, updateMerchantInventory, verifyCheckoutPayment } from "./bazaar";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { loadDemoMerchant } from "./bazaar";
import { synthesizeOrpheusBrief, transcribeGroqVoice } from "./voice";
import { analyzeStyleReference } from "./vision";
import { enforceRateLimit, requestIdentity } from "./rateLimit";
import { applyGrowthPriceSuggestion, createMerchantCatalogProducts, getMerchantAgentInsights, getMerchantGrowthInsights, getRecentPaymentStatus, reindexMerchantCatalog, toggleProductSponsorship, updateMerchantCatalogProduct } from "./merchantCatalog";

function limit(ctx: { req: { headers?: Record<string, unknown> } }, route: string, max: number, windowMs: number) {
  enforceRateLimit(`${route}:${requestIdentity(ctx.req.headers)}`, { max, windowMs });
}

export const commerceRouter = router({
  overview: publicProcedure
    .input(z.object({ merchantSlug: z.string().max(80).optional() }).optional())
    .query(({ input }) => getDemoOverview(input?.merchantSlug)),
  knownMerchants: publicProcedure.query(() => listKnownMerchantSlugs()),
  recordComparisonOutcome: publicProcedure
    .input(z.object({ winnerSlug: z.string().max(80), participantSlugs: z.array(z.string().max(80)).min(1).max(20), query: z.string().max(800) }))
    .mutation(({ input, ctx }) => { limit(ctx, "record-comparison", 30, 60_000); return recordComparisonOutcome(input); }),
  merchantFairnessStats: publicProcedure.query(() => getMerchantFairnessStats()),
  recentActivity: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).optional() }).optional())
    .query(({ input }) => getRecentAgentActivity(input?.limit ?? 12)),
  agentCard: publicProcedure
    .input(z.object({ merchantSlug: z.string().max(80).optional() }).optional())
    .query(async ({ input }) => {
    const merchant = await loadDemoMerchant(input?.merchantSlug);
    return {
      schemaVersion: "bazaaros.agent-card.v1",
      merchant: { id: merchant.id, name: merchant.name, slug: merchant.slug },
      capabilities: [
        { task: "catalog.search", authority: "SEARCH_AND_QUOTE_ONLY", description: "Grounded search over public source facts plus clearly labeled staging overlays." },
        { task: "cart.draft", authority: "HUMAN_PRESENT_CONFIRMATION_REQUIRED", description: "Creates a reviewed draft cart; it cannot authorize a payment action." },
        { task: "checkout.request", authority: "MANDATE_REQUIRED", description: "Requires a one-time merchant-, amount-, cart-, and expiry-bound confirmation capability." },
      ],
      payment: { provider: "razorpay_test_mode", automaticPayment: false, explicitConfirmationRequired: true, webhookSignatureRequired: true },
    };
  }),
  merchantCatalog: protectedProcedure.query(async ({ ctx }) => {
    const merchant = await loadDemoMerchant();
    if (ctx.user.role !== "admin" && ctx.user.id !== merchant.ownerId) throw new TRPCError({ code: "FORBIDDEN", message: "Only this merchant’s operator can inspect the merchant catalog console." });
    return getDemoOverview();
  }),
  merchantPaymentStatus: protectedProcedure.query(async ({ ctx }) => {
    const merchant = await loadDemoMerchant();
    if (ctx.user.role !== "admin" && ctx.user.id !== merchant.ownerId) throw new TRPCError({ code: "FORBIDDEN", message: "Only this merchant’s operator can view payment status." });
    return getRecentPaymentStatus(merchant.id);
  }),
  growthInsights: protectedProcedure.query(async ({ ctx }) => {
    const merchant = await loadDemoMerchant();
    if (ctx.user.role !== "admin" && ctx.user.id !== merchant.ownerId) throw new TRPCError({ code: "FORBIDDEN", message: "Only this merchant’s operator can view growth insights." });
    return getMerchantGrowthInsights(merchant.id);
  }),
  merchantAgentInsights: protectedProcedure.query(async ({ ctx }) => {
    const merchant = await loadDemoMerchant();
    if (ctx.user.role !== "admin" && ctx.user.id !== merchant.ownerId) throw new TRPCError({ code: "FORBIDDEN", message: "Only this merchant's operator can view their agent's marketplace performance." });
    return getMerchantAgentInsights(merchant.id);
  }),
  applyGrowthSuggestion: protectedProcedure
    .input(z.object({ productId: z.number().int().positive(), newPriceInrPaise: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const merchant = await loadDemoMerchant();
      if (ctx.user.role !== "admin" && ctx.user.id !== merchant.ownerId) throw new TRPCError({ code: "FORBIDDEN", message: "Only this merchant’s operator can apply a growth suggestion." });
      return applyGrowthPriceSuggestion({ merchantId: merchant.id, actorUserId: ctx.user.id, productId: input.productId, newPriceInrPaise: input.newPriceInrPaise });
    }),
  toggleSponsorship: protectedProcedure
    .input(z.object({ productId: z.number().int().positive(), isSponsored: z.boolean(), sponsorBoost: z.number().min(0).max(0.3).optional(), sponsorBudgetInrPaise: z.number().int().min(0).max(5_000_000).optional() }))
    .mutation(async ({ input, ctx }) => {
      const merchant = await loadDemoMerchant();
      if (ctx.user.role !== "admin" && ctx.user.id !== merchant.ownerId) throw new TRPCError({ code: "FORBIDDEN", message: "Only this merchant’s operator can manage sponsorship." });
      return toggleProductSponsorship({ merchantId: merchant.id, actorUserId: ctx.user.id, productId: input.productId, isSponsored: input.isSponsored, sponsorBoost: input.sponsorBoost, sponsorBudgetInrPaise: input.sponsorBudgetInrPaise });
    }),
  createCatalogProducts: protectedProcedure
    .input(z.object({ rows: z.array(z.object({ title: z.string().trim().min(2).max(220), brand: z.string().trim().max(160).optional(), description: z.string().trim().max(2000).optional(), imageUrl: z.string().url().max(2000).optional(), priceInr: z.number().positive().max(500000), inventory: z.number().int().min(0).max(9999), deliveryCities: z.array(z.string().trim().min(2).max(60)).min(1).max(12), deliveryEtaText: z.string().trim().min(3).max(160), styleTags: z.array(z.string().trim().min(2).max(30)).min(1).max(8), occasionTags: z.array(z.string().trim().min(2).max(30)).min(1).max(8) })).min(1).max(50) }))
    .mutation(async ({ input, ctx }) => {
      const merchant = await loadDemoMerchant();
      if (ctx.user.role !== "admin" && ctx.user.id !== merchant.ownerId) throw new TRPCError({ code: "FORBIDDEN", message: "Only this merchant’s operator can add products." });
      return createMerchantCatalogProducts({ merchantId: merchant.id, actorUserId: ctx.user.id, rows: input.rows });
    }),
  updateCatalogProduct: protectedProcedure
    .input(z.object({ productId: z.number().int().positive(), row: z.object({ title: z.string().trim().min(2).max(220), brand: z.string().trim().max(160).optional(), description: z.string().trim().max(2000).optional(), imageUrl: z.string().url().max(2000).optional(), priceInr: z.number().positive().max(500000), inventory: z.number().int().min(0).max(9999), deliveryCities: z.array(z.string().trim().min(2).max(60)).min(1).max(12), deliveryEtaText: z.string().trim().min(3).max(160), styleTags: z.array(z.string().trim().min(2).max(30)).min(1).max(8), occasionTags: z.array(z.string().trim().min(2).max(30)).min(1).max(8) }) }))
    .mutation(async ({ input, ctx }) => {
      const merchant = await loadDemoMerchant();
      if (ctx.user.role !== "admin" && ctx.user.id !== merchant.ownerId) throw new TRPCError({ code: "FORBIDDEN", message: "Only this merchant’s operator can edit products." });
      return updateMerchantCatalogProduct({ merchantId: merchant.id, actorUserId: ctx.user.id, productId: input.productId, row: input.row });
    }),
  reindexCatalog: protectedProcedure.mutation(async ({ ctx }) => {
    const merchant = await loadDemoMerchant();
    if (ctx.user.role !== "admin" && ctx.user.id !== merchant.ownerId) throw new TRPCError({ code: "FORBIDDEN", message: "Only this merchant’s operator can reindex the catalog." });
    return reindexMerchantCatalog(merchant.id, ctx.user.id);
  }),
  updateInventory: protectedProcedure
    .input(z.object({ productId: z.number().int().positive(), inventory: z.number().int().min(0).max(9999) }))
    .mutation(async ({ input, ctx }) => {
      const merchant = await loadDemoMerchant();
      if (ctx.user.role !== "admin" && ctx.user.id !== merchant.ownerId) throw new TRPCError({ code: "FORBIDDEN", message: "Only this merchant’s operator can update test inventory." });
      return updateMerchantInventory({ merchantId: merchant.id, productId: input.productId, inventory: input.inventory, actorUserId: ctx.user.id });
    }),
  run: publicProcedure
    .input(z.object({
      query: z.string().min(3).max(800),
      channel: z.enum(["text", "voice", "image", "a2a"]),
      includeImage: z.boolean().default(false),
      imageStyleTags: z.array(z.string().min(1).max(30)).max(6).optional(),
      authorityScope: z.string().max(100).optional(),
      merchantSlug: z.string().max(80).optional(),
      topN: z.number().int().min(1).max(10).optional(),
    }))
    .mutation(({ input, ctx }) => { limit(ctx, "commerce-run", 12, 60_000); return runCommerceAgent(input); }),
  runMarketplace: publicProcedure
    .input(z.object({
      query: z.string().min(3).max(800),
      channel: z.enum(["text", "voice", "image", "a2a"]),
      includeImage: z.boolean().default(false),
      imageStyleTags: z.array(z.string().min(1).max(30)).max(6).optional(),
      topN: z.number().int().min(1).max(10).optional(),
    }))
    .mutation(({ input, ctx }) => { limit(ctx, "marketplace-run", 12, 60_000); return runMarketplaceAgent(input); }),
  approveMandate: publicProcedure
    .input(z.object({ mandateId: z.number().int().positive(), confirmationToken: z.string().min(24).max(128) }))
    .mutation(({ input, ctx }) => { limit(ctx, "mandate-approval", 6, 60_000); return approveMandate(input.mandateId, input.confirmationToken); }),
  verifyCheckoutPayment: publicProcedure
    .input(z.object({
      orderId: z.number().int().positive(),
      razorpayOrderId: z.string().min(1),
      razorpayPaymentId: z.string().min(1),
      razorpaySignature: z.string().min(1),
    }))
    .mutation(({ input, ctx }) => { limit(ctx, "payment-verification", 8, 60_000); return verifyCheckoutPayment(input); }),
  simulateTestPaymentFailure: publicProcedure
    .input(z.object({ mandateId: z.number().int().positive(), confirmationToken: z.string().min(24).max(128) }))
    .mutation(({ input, ctx }) => { limit(ctx, "test-payment-failure", 6, 60_000); return simulateTestPaymentFailure(input.mandateId, input.confirmationToken); }),
  transcribeVoice: publicProcedure
    .input(z.object({ audioDataUrl: z.string().min(64).max(34_000_000) }))
    .mutation(({ input, ctx }) => { limit(ctx, "voice-transcription", 6, 60_000); return transcribeGroqVoice(input); }),
  synthesizeBrief: publicProcedure
    .input(z.object({ text: z.string().min(3).max(200) }))
    .mutation(({ input, ctx }) => { limit(ctx, "speech-synthesis", 10, 60_000); return synthesizeOrpheusBrief(input); }),
  analyzeImageStyle: publicProcedure
    .input(z.object({ imageDataUrl: z.string().min(64).max(12_000_000) }))
    .mutation(({ input, ctx }) => { limit(ctx, "vision-analysis", 6, 60_000); return analyzeStyleReference(input); }),
});
