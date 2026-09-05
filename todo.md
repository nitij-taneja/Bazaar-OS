# Project TODO

- [x] Establish provenance-labeled public fashion/gifting catalog ingestion and data documentation
- [x] Design and apply database schema for merchants, products, product facts, bundles, agent runs, decisions, mandates, orders, payment events, and audit events
- [x] Add first-class product facts and verified payment-event records with replay-safe webhook processing
- [x] Implement signed Razorpay webhook ingestion with duplicate detection and payment-event persistence
- [x] Add webhook acceptance, duplicate-event, and invalid-signature test coverage
- [x] Harden duplicate webhook persistence against repeated replay collisions and add multi-replay coverage
- [x] Build protected merchant catalog management and provenance views
- [x] Implement modular agent orchestration with structured intent, catalog, offer, merchant A2A, trust, checkout, and audit roles
- [x] Implement deterministic Trust Gateway with scope, amount, expiry, idempotency, and consent checks
- [x] Implement product hybrid retrieval with structured constraints, semantic-style ranking abstraction, and provenance cards
- [x] Implement transparent offer and optional bundle recommendation logic
- [x] Implement agent-card discovery and external buyer-agent simulation with authority scopes
- [x] Implement a Razorpay test-mode checkout adapter with safe mock fallback, webhook verification design, and payment failure handling
- [x] Build the premium dark customer commerce experience with Hinglish input, image reference upload, product recommendations, cart, and mandate confirmation
- [x] Build the Jarvis-style real-time agent pipeline visualizer with seven agents, animated states, data flow, and trace panels
- [x] Build merchant command center, agent-network console, audit ledger, decision receipt, and model cockpit screens
- [x] Integrate secure server-side configurable LLM, Groq Whisper transcription, and speech response pathways where credentials are available
- [x] Implement cache strategy, RBAC, authorization boundaries, rate limits, observability, and error states
- [x] Require an unguessable checkout-mandate capability token before approval and surface cache hit/miss evidence from the backend
- [x] Implement Decision Intelligence records that explain model/provider routing, multimodal/OCR decisions, retrieval mode, chunking, embedding, reranking, cache behavior, and policy outcomes per run
- [x] Surface per-decision rationale, input scope, latency, confidence, data provenance, and fallback behavior in the agent pipeline visualizer
- [x] Create Vitest coverage for trust rules, structured agent outputs, checkout idempotency, and provenance display logic
- [x] Verify desktop and mobile layouts, pipeline interactions, happy path, blocked action, and graceful payment-failure flow
- [x] Add a protected merchant catalog/provenance console backed by typed data and scoped management actions
- [x] Implement a truthful semantic-retrieval abstraction and expose its real fallback and reranking state in Decision Intelligence
- [x] Add a visible buyer-agent simulation that proves authority scopes through an end-to-end A2A flow
- [x] Add protected Razorpay fallback/error UX and verify a graceful payment-failure customer flow
- [x] Add Trust Gateway, checkout idempotency, and provenance-logic test coverage
- [x] Verify mobile layout plus explicit blocked-action and payment-failure scenarios
- [x] Add an explicit failed-payment customer state and verify it on desktop and mobile
- [x] Add checkout approval/payment-verification idempotency and provenance serialization tests
- [x] Wire a scoped inventory adjustment action into the protected merchant console and verify the typed update flow
- [x] Capture the displayed failed-payment outcome on desktop and mobile after running the safe failure simulation
- [x] Add service-level mandate approval and payment-verification idempotency tests
- [x] Review all TODO items, save a project checkpoint, and deliver the completed project
- [x] Select and integrate a real embedding model with persisted product vectors and cosine-similarity catalog ranking
- [x] Add embedding refresh/reindex controls and disclose vector, lexical, cache, and reranking evidence in Decision Intelligence
- [x] Request and activate the Razorpay Test Mode webhook secret, then display verified webhook payment-state updates in the UI
- [x] Create a friendly protected merchant dashboard with catalog upload, product create/edit, inventory, delivery, tags, and source/provenance controls
- [x] Add CSV catalog validation, preview, import, and error reporting for merchant uploads
- [x] Write in-project product, architecture, setup, webhook, operations, and hackathon-demo documentation
- [x] Add tests and visual verification for embedding retrieval, webhook status display, and merchant catalog management
- [x] Save the upgraded project checkpoint and deliver the new version
- [ ] Replace the portfolio-root Razorpay webhook URL with the published BazaarOS `/api/webhooks/razorpay` endpoint and validate Test Mode delivery
- [x] Add a protected merchant product edit flow for price, description, image, delivery, style, and occasion fields with audit logging and vector refresh
- [x] Disable immutable public-source identity fields in the product editor and explain the provenance boundary clearly
- [x] Return and display the real vector-refresh outcome for every merchant product edit
- [x] Add product-edit coverage for public-source and merchant-uploaded catalog records, audit logging, and embedding outcomes
- [x] Deliver a candid chat-based product review covering product scope, dataset provenance, architecture tradeoffs, risks, and hackathon decisions
- [ ] Create and deliver a clean downloadable BazaarOS project ZIP archive

## Session: Vercel migration + multi-merchant marketplace (2026-09-05)

**Done, verified, and pushed to `main` on GitHub:**

- [x] Migrated the database from MySQL to SQLite/Turso (libSQL) so the app runs outside the original Manus platform — schema, all upsert/returning call sites, seed scripts. Local dev needs zero setup (falls back to a local file); production points `DATABASE_URL`/`DATABASE_AUTH_TOKEN` at Turso.
- [x] Converted the Express app into a Vercel-deployable shape (`api/index.ts`, `vercel.json`) while keeping local `pnpm dev` unchanged.
- [x] Fixed a real bug: image vision analysis was silently always using a fake hash-bucket fallback because Groq had removed the hardcoded vision model. Replaced with a direct Google Gemini Vision call (real, tested against an actual photo).
- [x] Found and closed a real trust-boundary gap via live adversarial testing (`scripts/external-buyer-agents.mjs`): an external agent could omit its authority scope and get a mandate + auto-approve it with zero human involvement. Authority is now derived from the server-known channel, never trusted from client input. Re-verified live after the fix.
- [x] Scaled from 3 to **12 real merchants**, and from 26 to **300 real products** (byte-range-fetched from the public Amazon Reviews'23 dataset, same curation rules as the original 26 — no fake data). `pnpm db:seed:demo` seeds all of it.
- [x] Native cross-merchant marketplace agent (`runMarketplaceAgent`): one shared catalog query, each matching merchant gets one bounded/capped counter-offer round (max 6%, never an open auction), Trust Gateway runs once against the winning bid's final price.
- [x] Real, bounded sponsorship/ad system: a merchant-declared budget, a fixed per-impression cost, never overdrawn — and (after a review pass) fully disclosed in the a2a trace, the bidding UI ("Sponsored +X" tag), and the merchant console's "My Agent" panel.
- [x] Real, rule-based (not ML) merchant growth insights and fairness-observability dashboard, both computed from actual persisted agent-run history.
- [x] Order-acknowledgment pipeline stage (8 nodes now, was 7) with its own audit trail entry.
- [x] Live Agent Activity feed — any caller's real runs (browser, script, or a genuine external agent), not just your own.
- [x] UI pass based on live feedback: "why this" reasons now shown per product card, a consultative check-in with quick-reply options (cheaper/premium/something different) instead of jumping straight to checkout, and a technical "Inspect Agent Reasoning" toggle (off by default) so the full mesh/trust/decision-log detail is one click away instead of being the default view.
- [x] Fixed a real cache-invalidation bug: growth-suggestion/sponsorship/catalog edits wrote to the DB correctly but the 90-second in-memory catalog cache wasn't cleared, so changes silently didn't show for up to 90s.

**Explicitly not built (by design, discussed and agreed):**
- Real per-merchant login/multi-tenant accounts (one demo operator today).
- Actual ad billing — sponsorship spend is real bounded accounting, not a payment.
- An algorithm that auto-corrects ranking bias — the fairness dashboard is observability only.
- The ads/sponsorship *marketplace* (a separate buyer for ad slots), a full multi-round negotiation protocol, and literal 1000+-merchant scale — all flagged as pitch-deck vision, not built.
- A standing/pre-authorized "shopping mandate" that would let an external agent complete a purchase without a human present — explicitly declined; would reopen the trust-boundary question above.

**Remaining before you can demo/submit:**
- [ ] Actually deploy to Vercel (import the GitHub repo, add env vars from `.env.example`) — I've prepared everything but can't do the Vercel dashboard steps myself.
- [ ] Get a Turso database and run `pnpm db:push` + `pnpm db:seed:demo` against it (production still needs this — local dev has been using a local SQLite file).
- [ ] Point Razorpay's Test Mode webhook at the published `https://<your-domain>/api/webhooks/razorpay` (the original portfolio-URL item above is the same task).
- [ ] Get your own Razorpay Test Mode keys into the deployed env and do one real end-to-end payment test (Groq and Gemini keys are already confirmed live-tested this session; Razorpay has not been).
- [ ] Optional, if there's time: extend the "Inspect Agent Reasoning" toggle pattern to the Merchant Console / Landing Page if those still feel too dense by comparison to the now-simplified Studio page.
- [ ] Rehearse the demo script in `docs/BAZAAROS_OPERATING_GUIDE.md` end to end — it hasn't been re-walked since this session's changes.
