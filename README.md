# BazaarOS

**An agent-ready merchant gateway** — built for Razorpay's hiring hackathon, Track 01: *AI Growth & Agentic Commerce*.

BazaarOS turns a merchant's catalog into a grounded discovery, recommendation, quote, mandate, checkout, and audit pipeline usable by both human shoppers and external AI buyer agents — while keeping every money-moving decision deterministic, bounded, and auditable.

## Why this exists

Track 01 asks for two things at once:
1. **Revenue growth** — use AI to lift conversion, average order value, and repeat purchase.
2. **AI transactability** — let an external AI buyer agent discover, quote, and (within limits) transact with the merchant.

The hard constraint the track adds: *every money action must be explainable, bounded, and gated.* An LLM can search, rank, and recommend — it can never directly authorize a charge. BazaarOS's architecture is built around that boundary.

## Architecture

```
Human shopper (text/voice/image)     External AI buyer agent (A2A)
              │                                  │
              ▼                                  ▼
        Intent Agent                      Merchant A2A Agent
              │                                  │
              └───────────────┬──────────────────┘
                               ▼
                     Catalog Intelligence
                (hard filters → BGE vector RAG)
                               │
                               ▼
                         Offer Agent
              (transparent pricing + optional bundles)
                               │
                               ▼
                   Trust Gateway (deterministic)
        stock • price cap • delivery • expiry • idempotency
                               │
                   draft mandate only, no charge
                               ▼
                  Explicit customer confirmation
                               │
                               ▼
                  Razorpay Test Mode order + checkout
                               │
                               ▼
              Signed webhook → verified payment event
                               │
                               ▼
                    Audit Ledger (immutable receipt)
```

Seven typed pipeline stages (Intent, Catalog, Offer, A2A, Trust, Checkout, Audit) produce an inspectable decision trace for every run — not seven independent autonomous agents chatting with each other, but a structured, auditable pipeline. That's a deliberate choice: money-gating logic is deterministic code, not an LLM's guess.

## What's real vs. what degrades gracefully

| Capability | With API key | Without it |
|---|---|---|
| Hinglish intent parsing | Real Groq LLM extraction | Deterministic rule-based parser |
| Image style analysis | Real Google Gemini Vision | Disclosed non-AI heuristic fallback |
| Voice transcription / TTS | Real Groq Whisper / Orpheus | Feature unavailable, fails loudly |
| Semantic product search | Real HuggingFace BGE-small embeddings | Lexical/keyword search |
| Trust Gateway, Razorpay, audit ledger | Always real — never LLM-gated | — |

Every fallback is disclosed in-app via the Decision Intelligence panel, not hidden.

## Stack

- **Frontend:** React 19, Vite, Tailwind, wouter, tRPC + TanStack Query
- **Backend:** Express, tRPC, Drizzle ORM
- **Database:** SQLite locally (zero setup) / Turso (libSQL) in production — serverless-friendly, works on Vercel
- **Payments:** Razorpay Test Mode (real order API + signed webhook verification)
- **AI:** Groq (LLM intent, Whisper STT, Orpheus TTS), Google Gemini (vision), HuggingFace (embeddings)

## Local development

```bash
pnpm install
cp .env.example .env   # fill in at least RAZORPAY_KEY_ID/SECRET; DB defaults to a local file
pnpm dev                # http://localhost:5000 (or next free port)
```

No database setup is required for local dev — it falls back to a local `./local.db` SQLite file automatically.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Start the dev server (Vite + Express, hot reload) |
| `pnpm build` | Production build (client + server bundle) |
| `pnpm check` | TypeScript type-check |
| `pnpm test` | Run the Vitest suite |
| `pnpm db:push` | Generate + run Drizzle migrations against `DATABASE_URL` |
| `pnpm db:seed` | Seed the real Amazon Reviews'23 fashion catalog (26 products) into the `novacart` merchant |
| `pnpm db:reindex` | Regenerate product embeddings for semantic search |

## Deploying

See [.env.example](.env.example) for the full environment variable list. Deploy target is Vercel (`vercel.json` included, serverless entry at `api/index.ts`) with a Turso database for persistence. Full deployment guide and demo script: [docs/BAZAAROS_OPERATING_GUIDE.md](docs/BAZAAROS_OPERATING_GUIDE.md).

## Tests

19 Vitest suites cover Trust Gateway rules, checkout idempotency, webhook signature verification and replay handling, provenance display logic, and merchant catalog editing. Run with `pnpm test`.

## License

MIT
