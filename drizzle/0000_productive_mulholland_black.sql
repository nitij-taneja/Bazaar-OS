CREATE TABLE `agentRuns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`merchantId` integer NOT NULL,
	`intentId` integer NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`modelProfile` text(64) NOT NULL,
	`cacheDisposition` text NOT NULL,
	`startedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`completedAt` integer
);
--> statement-breakpoint
CREATE INDEX `agent_runs_merchant_idx` ON `agentRuns` (`merchantId`);--> statement-breakpoint
CREATE INDEX `agent_runs_intent_idx` ON `agentRuns` (`intentId`);--> statement-breakpoint
CREATE TABLE `agentSteps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`runId` integer NOT NULL,
	`agentName` text NOT NULL,
	`status` text NOT NULL,
	`decisionKind` text(100) NOT NULL,
	`rationale` text NOT NULL,
	`inputSummary` text NOT NULL,
	`outputSummary` text NOT NULL,
	`alternatives` text NOT NULL,
	`provenance` text NOT NULL,
	`latencyMs` integer NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `agent_steps_run_idx` ON `agentSteps` (`runId`);--> statement-breakpoint
CREATE TABLE `auditEvents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`merchantId` integer NOT NULL,
	`runId` integer,
	`mandateId` integer,
	`eventType` text(120) NOT NULL,
	`actorType` text NOT NULL,
	`payload` text NOT NULL,
	`integrityHash` text(64) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_events_merchant_idx` ON `auditEvents` (`merchantId`);--> statement-breakpoint
CREATE INDEX `audit_events_run_idx` ON `auditEvents` (`runId`);--> statement-breakpoint
CREATE TABLE `catalogSources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`merchantId` integer NOT NULL,
	`name` text(200) NOT NULL,
	`publisher` text(200) NOT NULL,
	`sourceUrl` text NOT NULL,
	`retrievedAt` integer NOT NULL,
	`sourceNotes` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `catalog_sources_merchant_idx` ON `catalogSources` (`merchantId`);--> statement-breakpoint
CREATE TABLE `checkoutMandates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`runId` integer NOT NULL,
	`merchantId` integer NOT NULL,
	`cartSnapshot` text NOT NULL,
	`amountInrPaise` integer NOT NULL,
	`authorityScope` text(80) NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`expiresAt` integer NOT NULL,
	`approvedAt` integer,
	`idempotencyKey` text(128) NOT NULL,
	`confirmationToken` text(128) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checkout_mandate_idempotency_unique` ON `checkoutMandates` (`idempotencyKey`);--> statement-breakpoint
CREATE UNIQUE INDEX `checkout_mandate_confirmation_unique` ON `checkoutMandates` (`confirmationToken`);--> statement-breakpoint
CREATE INDEX `checkout_mandates_run_idx` ON `checkoutMandates` (`runId`);--> statement-breakpoint
CREATE TABLE `checkoutOrders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mandateId` integer NOT NULL,
	`provider` text(40) NOT NULL,
	`providerOrderId` text(128),
	`status` text NOT NULL,
	`amountInrPaise` integer NOT NULL,
	`failureCode` text(120),
	`failureMessage` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `checkout_orders_mandate_idx` ON `checkoutOrders` (`mandateId`);--> statement-breakpoint
CREATE TABLE `commerceIntents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`merchantId` integer NOT NULL,
	`userId` integer,
	`channel` text NOT NULL,
	`rawInput` text NOT NULL,
	`normalizedIntent` text NOT NULL,
	`imageAssetKey` text,
	`audioAssetKey` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `commerce_intents_merchant_idx` ON `commerceIntents` (`merchantId`);--> statement-breakpoint
CREATE TABLE `merchants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ownerId` integer NOT NULL,
	`name` text(160) NOT NULL,
	`slug` text(120) NOT NULL,
	`description` text,
	`defaultCurrency` text(3) DEFAULT 'INR' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `merchants_slug_unique` ON `merchants` (`slug`);--> statement-breakpoint
CREATE INDEX `merchants_owner_idx` ON `merchants` (`ownerId`);--> statement-breakpoint
CREATE TABLE `paymentEvents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`checkoutOrderId` integer,
	`provider` text(40) NOT NULL,
	`providerEventId` text(160) NOT NULL,
	`eventType` text(120) NOT NULL,
	`signatureVerified` integer DEFAULT false NOT NULL,
	`replayDisposition` text NOT NULL,
	`payloadHash` text(64) NOT NULL,
	`payloadMetadata` text NOT NULL,
	`processedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_event_provider_event_unique` ON `paymentEvents` (`provider`,`providerEventId`);--> statement-breakpoint
CREATE INDEX `payment_events_order_idx` ON `paymentEvents` (`checkoutOrderId`);--> statement-breakpoint
CREATE TABLE `productBundles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`primaryProductId` integer NOT NULL,
	`accessoryProductId` integer NOT NULL,
	`rationale` text NOT NULL,
	`confidence` text(8) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_bundle_unique` ON `productBundles` (`primaryProductId`,`accessoryProductId`);--> statement-breakpoint
CREATE TABLE `productEmbeddings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`productId` integer NOT NULL,
	`model` text(160) NOT NULL,
	`dimensions` integer NOT NULL,
	`inputSha256` text(64) NOT NULL,
	`vector` text NOT NULL,
	`normalized` integer DEFAULT true NOT NULL,
	`generatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_embedding_product_model_unique` ON `productEmbeddings` (`productId`,`model`);--> statement-breakpoint
CREATE INDEX `product_embeddings_product_idx` ON `productEmbeddings` (`productId`);--> statement-breakpoint
CREATE TABLE `productFacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`productId` integer NOT NULL,
	`factKey` text(120) NOT NULL,
	`factValue` text NOT NULL,
	`factKind` text NOT NULL,
	`sourcePointer` text(240) NOT NULL,
	`confidence` text(32) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_fact_unique` ON `productFacts` (`productId`,`factKey`,`factKind`);--> statement-breakpoint
CREATE INDEX `product_facts_product_idx` ON `productFacts` (`productId`);--> statement-breakpoint
CREATE TABLE `productOperationalOverlays` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`productId` integer NOT NULL,
	`testPriceInrPaise` integer NOT NULL,
	`testInventory` integer NOT NULL,
	`deliveryCities` text NOT NULL,
	`deliveryEtaText` text(160) NOT NULL,
	`styleTags` text NOT NULL,
	`occasionTags` text NOT NULL,
	`overlayLabel` text(200) NOT NULL,
	`overlayRationale` text NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_operational_overlay_product_unique` ON `productOperationalOverlays` (`productId`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`merchantId` integer NOT NULL,
	`catalogSourceId` integer NOT NULL,
	`sourceProductId` text(128) NOT NULL,
	`title` text NOT NULL,
	`brand` text(200),
	`description` text,
	`features` text NOT NULL,
	`sourceDetails` text NOT NULL,
	`sourceImageUrl` text,
	`sourcePriceUsdCents` integer,
	`sourceAverageRating` text(16),
	`sourceRatingCount` integer,
	`boughtTogetherIds` text NOT NULL,
	`catalogDocument` text NOT NULL,
	`documentSha256` text(64) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_merchant_source_product_unique` ON `products` (`merchantId`,`sourceProductId`);--> statement-breakpoint
CREATE INDEX `products_merchant_idx` ON `products` (`merchantId`);--> statement-breakpoint
CREATE INDEX `products_source_idx` ON `products` (`catalogSourceId`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text(64) NOT NULL,
	`name` text,
	`email` text(320),
	`loginMethod` text(64),
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`lastSignedIn` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);