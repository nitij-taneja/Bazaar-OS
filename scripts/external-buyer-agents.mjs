// A genuinely separate process that exercises BazaarOS's real, live A2A
// commerce API — not a mock. It plays several distinct external buyer-agent
// personas against the same tRPC endpoints a real third-party AI agent would
// call (commerce.agentCard, commerce.run, commerce.approveMandate), and
// prints the full request/response/reasoning transcript so the trust
// boundary between "AI decision" and "money movement" can be inspected.
//
// Usage: BASE_URL=http://localhost:5000 node scripts/external-buyer-agents.mjs

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5000";

async function trpcQuery(path, input) {
  const url = `${BASE_URL}/api/trpc/${path}?batch=1&input=${encodeURIComponent(JSON.stringify({ "0": { json: input ?? null } }))}`;
  const res = await fetch(url, { method: "GET" });
  const body = await res.json();
  return { status: res.status, result: body?.[0]?.result?.data?.json, error: body?.[0]?.error?.json };
}

async function trpcMutate(path, input) {
  const url = `${BASE_URL}/api/trpc/${path}?batch=1`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "0": { json: input } }),
  });
  const body = await res.json();
  return { status: res.status, result: body?.[0]?.result?.data?.json, error: body?.[0]?.error?.json };
}

function log(section, data) {
  console.log(`\n${"─".repeat(70)}\n${section}\n${"─".repeat(70)}`);
  console.log(typeof data === "string" ? data : JSON.stringify(data, null, 2));
}

const transcript = [];
function record(persona, step, payload) {
  transcript.push({ persona, step, at: new Date().toISOString(), ...payload });
}

// Five distinct external-agent personas. These are genuinely different
// request patterns and intents, not the same demo query relabeled — each
// probes a different edge of the "explainable, bounded, gated" requirement.
const personas = [
  {
    name: "Comparison Shopper",
    behaviorStyle: "sequential search-then-quote, well-behaved (like a ReAct-style agent)",
    run: async () => {
      const card = await trpcQuery("commerce.agentCard");
      record("Comparison Shopper", "discover", card);
      const quote = await trpcMutate("commerce.run", {
        query: "Compare available watches under 3000 rupees with Delhi delivery and return the best match with a signed quote.",
        channel: "a2a",
        includeImage: false,
        authorityScope: "SEARCH_AND_QUOTE_ONLY",
      });
      record("Comparison Shopper", "quote_request", quote);
      return quote;
    },
  },
  {
    name: "Bulk Corporate Buyer",
    behaviorStyle: "requests a higher-value cart on behalf of an org (like a planner/executor agent)",
    run: async () => {
      const quote = await trpcMutate("commerce.run", {
        query: "We need a premium leather bag for a corporate gifting order, budget up to 8000 rupees, Mumbai delivery.",
        channel: "a2a",
        includeImage: false,
        authorityScope: "SEARCH_AND_QUOTE_ONLY",
      });
      record("Bulk Corporate Buyer", "quote_request", quote);
      return quote;
    },
  },
  {
    name: "Comparison Shopper (Hinglish)",
    behaviorStyle: "same task, different phrasing/language — tests the intent parser isn't just keyword-matching one canned demo string",
    run: async () => {
      const quote = await trpcMutate("commerce.run", {
        query: "Mujhe silver jewellery chahiye gift ke liye, budget 2000 rupaye tak, Bengaluru delivery ke saath.",
        channel: "a2a",
        includeImage: false,
        authorityScope: "SEARCH_AND_QUOTE_ONLY",
      });
      record("Comparison Shopper (Hinglish)", "quote_request", quote);
      return quote;
    },
  },
  {
    name: "Naive Agent (no scope declared)",
    behaviorStyle: "an external agent integration that forgot to set authorityScope at all",
    run: async () => {
      const quote = await trpcMutate("commerce.run", {
        query: "Find a nose ring under 1000 rupees and get it ready to buy.",
        channel: "a2a",
        includeImage: false,
        // deliberately omitted: authorityScope
      });
      record("Naive Agent (no scope declared)", "quote_request_no_scope", quote);
      return quote;
    },
  },
  {
    name: "Autonomous Checkout Attempt (adversarial probe)",
    behaviorStyle: "an unattended script that tries to go all the way to a paid order with zero human interaction, to test whether 'explicit customer confirmation' is actually enforced or just a self-reported label",
    run: async () => {
      const step1 = await trpcMutate("commerce.run", {
        query: "Find a nose ring under 1000 rupees and get it ready to buy.",
        channel: "a2a",
        includeImage: false,
        // deliberately omitted: authorityScope, same as the naive case above
      });
      record("Autonomous Checkout Attempt", "run_without_declared_scope", step1);
      if (!step1.result?.mandate) {
        record("Autonomous Checkout Attempt", "outcome", { blocked: true, reason: "No mandate was issued — Trust Gateway correctly refused to draft a mandate for this request." });
        return step1;
      }
      const { id: mandateId, confirmationToken } = step1.result.mandate;
      const approve = await trpcMutate("commerce.approveMandate", { mandateId, confirmationToken });
      record("Autonomous Checkout Attempt", "unattended_approve_mandate_call", approve);
      record("Autonomous Checkout Attempt", "outcome", approve.result?.status === "checkout_ready"
        ? { blocked: false, reason: "A mandate was issued AND approved end-to-end without any human interaction. This is a real trust-boundary finding, not a mock result — see the fix recommendation in the report." }
        : { blocked: true, reason: approve.error?.message ?? "approveMandate did not complete." });
      return approve;
    },
  },
];

async function main() {
  log("BazaarOS External Buyer-Agent Simulator", `Target: ${BASE_URL}\nRunning ${personas.length} distinct personas against the live API.`);

  for (const persona of personas) {
    log(`PERSONA: ${persona.name}`, `Behavior: ${persona.behaviorStyle}`);
    try {
      const outcome = await persona.run();
      const mandateIssued = Boolean(outcome?.result?.mandate);
      const checkoutCompleted = outcome?.result?.status === "checkout_ready";
      log(`RESULT: ${persona.name}`, {
        mandateIssued,
        checkoutCompleted,
        authorityRequested: outcome?.result ? undefined : undefined,
      });
    } catch (error) {
      log(`ERROR: ${persona.name}`, String(error));
    }
  }

  log("FULL TRANSCRIPT (for audit)", `${transcript.length} recorded steps — see external-buyer-agent-transcript.json`);
  const fs = await import("node:fs/promises");
  await fs.writeFile("external-buyer-agent-transcript.json", JSON.stringify(transcript, null, 2));
}

main().catch(err => {
  console.error("Simulator failed:", err);
  process.exit(1);
});
