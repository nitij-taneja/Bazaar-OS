# BazaarOS Research Sources

## Commerce Data Provenance

BazaarOS imports a selected set of Amazon Fashion records from the public **Amazon Reviews’23** metadata corpus. Product titles, public source prices, image URLs, features, descriptions, details, and bought-together fields are retained as source facts. Operational price conversion, inventory, delivery, and style overlays are stored separately and clearly labeled as deterministic staging data.

| Source | Use in BazaarOS | URL |
|---|---|---|
| Amazon Reviews’23, McAuley Lab | Public fashion/gifting catalog metadata, images, original source-price provenance, and bought-together links | https://amazon-reviews-2023.github.io/ |
| Hugging Face Amazon Reviews’23 dataset | Download path for the Amazon Fashion metadata source | https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023 |
| Qdrant H&M e-commerce products | Research reference for rich fashion catalog structure and precomputed retrieval fields; not used to invent merchant operational facts | https://huggingface.co/datasets/Qdrant/hm_ecommerce_products |

## Agentic-Commerce Direction

| Source | Role in product design | URL |
|---|---|---|
| Stripe Agentic Commerce Protocol documentation | Informs agent-readable catalog, cart, checkout, and delegated commerce adapter design | https://docs.stripe.com/agentic-commerce/acp |
| Google Agents to Payments Protocol announcement | Informs the Intent → Cart → Payment Mandate trust model and bounded delegated authority design | https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol |
| Razorpay / NPCI agentic payments discussion | Informs India-first consent, spend-limit, revocation, and UPI-reserve-pay framing; BazaarOS does not claim a live UAP integration | https://razorpay.com/blog/agentic-payments-and-npci/ |
| x402 | Documented only as a future adapter direction for Internet-native digital-agent payments, not as the primary INR customer checkout rail | https://www.x402.org/ |

## Live Model and Speech Choices

| Component | Choice and reason | URL |
|---|---|---|
| Preference extraction | Groq `openai/gpt-oss-20b`, queried from the live Groq model catalog. It produces typed non-financial preference fields only; deterministic code keeps budget, stock, delivery, and payment constraints. | https://console.groq.com/docs/models |
| Hinglish speech-to-text | Groq `whisper-large-v3-turbo`, selected for multilingual transcription and strong cost/latency tradeoff on short recorded requests. Groq supports direct transcription uploads and a 25 MB free-tier limit. | https://console.groq.com/docs/speech-to-text |
| Agent voice brief | Groq `canopylabs/orpheus-v1-english`, voice `hannah`, used only for short English summaries. It is visibly disclosed that Orpheus supports English and Saudi Arabic rather than native Hindi/Hinglish TTS. | https://console.groq.com/docs/text-to-speech/orpheus |
| Visual style analysis | Built-in `gemini-3-flash-preview`, selected after live catalog inspection for lower-latency single-image multimodal analysis. It extracts visible non-sensitive style tags only. | https://ai.google.dev/gemini-api/docs |

## Payment Reliability Sources

| Source | Use in BazaarOS | URL |
|---|---|---|
| Razorpay Test Mode documentation | Test Mode order creation and checkout behavior; no real money is used in Test Mode. | https://razorpay.com/docs/payments/dashboard/test-live-modes/ |
| Razorpay Webhooks documentation | Signature verification, event handling, and idempotent processing design. | https://razorpay.com/docs/webhooks/ |

> BazaarOS deliberately separates public source facts, merchant staging overlays, model-derived style preferences, and deterministic payment policy outcomes. The system never represents a model inference as catalog truth.
