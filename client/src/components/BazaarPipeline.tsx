import { motion } from "framer-motion";
import { BadgeCheck, BrainCircuit, CheckCircle2, ChevronRight, CircleDollarSign, Clock, Cpu, ExternalLink, Network, Radar, ReceiptText, ScanSearch, ShieldCheck, Sparkles, Terminal, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type AgentName = "intent" | "catalog" | "offer" | "a2a" | "trust" | "merchant_ack" | "checkout" | "audit";

const agents: Record<AgentName, { label: string; short: string; role: string; Icon: typeof BrainCircuit; tone: string; left: string; top: string }> = {
  intent: { label: "Intent Agent", short: "INT", role: "Extracts typed constraints & preferences", Icon: BrainCircuit, tone: "cyan", left: "8%", top: "49%" },
  catalog: { label: "Catalog Intelligence", short: "CAT", role: "Hybrid Vector (BGE) + Lexical RAG", Icon: ScanSearch, tone: "violet", left: "26%", top: "20%" },
  offer: { label: "Offer Agent", short: "OFR", role: "Transparent complementary bundles", Icon: Sparkles, tone: "amber", left: "26%", top: "76%" },
  a2a: { label: "Merchant A2A", short: "A2A", role: "Protocol card & capability gate", Icon: Network, tone: "blue", left: "46%", top: "14%" },
  trust: { label: "Trust Gateway", short: "TRU", role: "Deterministic policy & amount gating", Icon: ShieldCheck, tone: "emerald", left: "46%", top: "56%" },
  merchant_ack: { label: "Merchant Acknowledgment", short: "ACK", role: "This merchant accepts fulfillment responsibility", Icon: BadgeCheck, tone: "teal", left: "65%", top: "82%" },
  checkout: { label: "Checkout Executor", short: "CHK", role: "Razorpay Test-Mode order dispatch", Icon: CircleDollarSign, tone: "rose", left: "84%", top: "32%" },
  audit: { label: "Audit Ledger", short: "AUD", role: "SHA-256 cryptographic receipt", Icon: ReceiptText, tone: "orange", left: "84%", top: "76%" },
};

const order: AgentName[] = ["intent", "catalog", "offer", "a2a", "trust", "merchant_ack", "checkout", "audit"];
const edges: Array<[AgentName, AgentName]> = [
  ["intent", "catalog"],
  ["intent", "offer"],
  ["catalog", "a2a"],
  ["catalog", "trust"],
  ["offer", "trust"],
  ["a2a", "trust"],
  ["trust", "merchant_ack"],
  ["merchant_ack", "checkout"],
  ["trust", "audit"],
  ["checkout", "audit"],
];

const tones: Record<string, { border: string; text: string; bg: string; glow: string; badge: string }> = {
  cyan: { border: "border-cyan-500/40 hover:border-cyan-400 dark:border-cyan-400/40 dark:hover:border-cyan-300", text: "text-cyan-700 dark:text-cyan-300", bg: "bg-cyan-500/10 dark:bg-cyan-950/40", glow: "shadow-[0_0_25px_rgba(34,211,238,0.25)]", badge: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20" },
  violet: { border: "border-violet-500/40 hover:border-violet-400 dark:border-violet-400/40 dark:hover:border-violet-300", text: "text-violet-700 dark:text-violet-300", bg: "bg-violet-500/10 dark:bg-violet-950/40", glow: "shadow-[0_0_25px_rgba(167,139,250,0.25)]", badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20" },
  amber: { border: "border-amber-500/40 hover:border-amber-400 dark:border-amber-400/40 dark:hover:border-amber-300", text: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500/10 dark:bg-amber-950/40", glow: "shadow-[0_0_25px_rgba(251,191,36,0.25)]", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20" },
  blue: { border: "border-blue-500/40 hover:border-blue-400 dark:border-blue-400/40 dark:hover:border-blue-300", text: "text-blue-700 dark:text-blue-300", bg: "bg-blue-500/10 dark:bg-blue-950/40", glow: "shadow-[0_0_25px_rgba(96,165,250,0.25)]", badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20" },
  emerald: { border: "border-emerald-500/40 hover:border-emerald-400 dark:border-emerald-400/40 dark:hover:border-emerald-300", text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/10 dark:bg-emerald-950/40", glow: "shadow-[0_0_25px_rgba(52,211,153,0.25)]", badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20" },
  rose: { border: "border-rose-500/40 hover:border-rose-400 dark:border-rose-400/40 dark:hover:border-rose-300", text: "text-rose-700 dark:text-rose-300", bg: "bg-rose-500/10 dark:bg-rose-950/40", glow: "shadow-[0_0_25px_rgba(251,113,133,0.25)]", badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20" },
  orange: { border: "border-orange-500/40 hover:border-orange-400 dark:border-orange-400/40 dark:hover:border-orange-300", text: "text-orange-700 dark:text-orange-300", bg: "bg-orange-500/10 dark:bg-orange-950/40", glow: "shadow-[0_0_25px_rgba(251,146,60,0.25)]", badge: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20" },
  teal: { border: "border-teal-500/40 hover:border-teal-400 dark:border-teal-400/40 dark:hover:border-teal-300", text: "text-teal-700 dark:text-teal-300", bg: "bg-teal-500/10 dark:bg-teal-950/40", glow: "shadow-[0_0_25px_rgba(45,212,191,0.25)]", badge: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20" },
};

export function PipelineVisualizer({ traces, activeAgent, selectedAgent, onSelect }: { traces: any[]; activeAgent: AgentName | null; selectedAgent: AgentName; onSelect: (agent: AgentName) => void }) {
  const completed = traces.map(trace => trace.agentName as AgentName);
  const isRunning = activeAgent !== null;

  return (
    <section className="relative min-h-[520px] overflow-hidden rounded-[28px] border border-border bg-card/90 dark:bg-[#060a17] p-5 shadow-lg backdrop-blur-2xl transition-colors">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 jarvis-grid opacity-50 dark:opacity-60 pointer-events-none" />
      <div className="absolute -left-20 top-6 size-72 rounded-full bg-cyan-500/10 dark:bg-cyan-500/12 blur-[120px] pointer-events-none" />
      <div className="absolute -right-20 bottom-4 size-80 rounded-full bg-violet-600/10 dark:bg-violet-600/12 blur-[130px] pointer-events-none" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-96 rounded-full bg-emerald-500/5 dark:bg-emerald-500/6 blur-[140px] pointer-events-none" />

      {/* Top Header telemetry */}
      <div className="relative z-30 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-300 shadow-sm">
            <Radar className={`size-5 ${isRunning ? "animate-spin" : ""}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-[0.2em] text-cyan-600 dark:text-cyan-400">AUTONOMOUS AGENT MESH</span>
              <span className="rounded bg-cyan-500/10 dark:bg-cyan-400/10 px-1.5 py-0.5 text-[9px] font-mono text-cyan-700 dark:text-cyan-300">8 ACTIVE NODES</span>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">Live Decision & Capability Topology</h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-[11px] font-semibold text-foreground">
            <span className={`size-2 rounded-full ${isRunning ? "animate-ping bg-cyan-500" : "bg-emerald-500 shadow-[0_0_8px_#10b981]"}`} />
            <span>{isRunning ? "PROCESSING PIPELINE" : "STANDBY READY"}</span>
          </div>
        </div>
      </div>

      {/* SVG Mesh Graph */}
      <div className="relative mt-2 h-[420px] w-full">
        <svg viewBox="0 0 1000 520" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible pointer-events-none" aria-hidden="true">
          <defs>
            <linearGradient id="edgeGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id="activeEdgeGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.95" />
            </linearGradient>
          </defs>
          {edges.map(([from, to]) => {
            const source = agents[from];
            const target = agents[to];
            const x1 = Number.parseFloat(source.left) * 10;
            const y1 = Number.parseFloat(source.top) * 5.2;
            const x2 = Number.parseFloat(target.left) * 10;
            const y2 = Number.parseFloat(target.top) * 5.2;
            const live = activeAgent === from || activeAgent === to || (completed.includes(from) && completed.includes(to));
            return (
              <g key={`${from}-${to}`}>
                <path
                  d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
                  className={`transition-all duration-500 ${live ? "stroke-[2.5px] opacity-100" : "stroke-[1.5px] opacity-35"}`}
                  stroke={live ? "url(#activeEdgeGradient)" : "url(#edgeGradient)"}
                  fill="none"
                  strokeDasharray={live ? "6,4" : "none"}
                />
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {order.map(name => {
          const agent = agents[name];
          const tone = tones[agent.tone];
          const Icon = agent.Icon;
          const active = activeAgent === name;
          const done = completed.includes(name);
          const isSelected = selectedAgent === name;

          return (
            <motion.button
              key={name}
              onClick={() => onSelect(name)}
              className={`agent-node absolute z-20 w-[140px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-3.5 text-left transition-all duration-300 ${
                active
                  ? `${tone.bg} ${tone.border} ${tone.glow} ring-2 ring-cyan-500 dark:ring-cyan-400/80`
                  : isSelected
                  ? "bg-card border-primary ring-2 ring-primary/40 shadow-xl"
                  : "bg-card/95 border-border hover:border-cyan-500/40 hover:bg-card dark:bg-[#0b1020]/90 dark:border-white/10 dark:hover:border-white/25 dark:hover:bg-[#0e162c]"
              }`}
              style={{ left: agent.left, top: agent.top }}
              animate={{
                scale: active ? 1.08 : isSelected ? 1.04 : 1,
                y: active ? -4 : 0,
              }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-2.5 flex items-center justify-between">
                <span className={`grid size-8 place-items-center rounded-xl border border-border ${tone.bg} ${tone.text}`}>
                  <Icon size={16} />
                </span>
                <span className={`size-2.5 rounded-full transition-all ${active ? "animate-ping bg-cyan-500 dark:bg-cyan-400" : done ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-muted-foreground/40"}`} />
              </div>
              <p className="text-[9px] font-mono font-bold tracking-[0.16em] text-muted-foreground">{agent.short}</p>
              <p className="mt-0.5 text-xs font-bold text-foreground truncate">{agent.label}</p>
              <div className="mt-1.5 flex items-center justify-between text-[9px] font-medium">
                <span className={active ? tone.text : done ? "text-emerald-600 dark:text-emerald-300" : "text-muted-foreground"}>
                  {active ? "PROCESSING" : done ? "VERIFIED" : "STANDBY"}
                </span>
                {done ? <CheckCircle2 size={11} className="text-emerald-500" /> : null}
              </div>
            </motion.button>
          );
        })}

        {/* Footer Hint */}
        <div className="absolute bottom-1 left-1/2 z-20 -translate-x-1/2 flex items-center gap-2 rounded-full border border-border bg-card/85 px-4 py-1.5 text-center text-[10px] text-muted-foreground backdrop-blur-md shadow-xs">
          <Zap size={12} className="text-cyan-600 dark:text-cyan-400" />
          <span>Every handoff is an immutable, bounded, typed capability — click any node to inspect telemetry.</span>
        </div>
      </div>
    </section>
  );
}

export function AgentTracePanel({ trace, decision }: { trace: any; decision: any }) {
  if (!trace) {
    return (
      <section className="flex min-h-[340px] flex-col items-center justify-center rounded-[26px] border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground">
        <Cpu className="size-10 text-muted-foreground/60 mb-3 animate-pulse" />
        <p className="text-sm font-semibold text-foreground">No Agent Node Selected</p>
        <p className="mt-1 text-xs text-muted-foreground max-w-xs">Click on any agent node above to inspect its live data scope, reasoning, and policy bounds.</p>
      </section>
    );
  }

  const agent = agents[trace.agentName as AgentName] ?? agents.intent;
  const tone = tones[agent.tone] ?? tones.cyan;
  const Icon = agent.Icon;

  const compact = (record: Record<string, unknown>) =>
    Object.entries(record ?? {})
      .slice(0, 3)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value) : String(value)}`)
      .join("\n");

  return (
    <section className="min-h-[340px] rounded-[26px] border border-border bg-card/90 dark:bg-[#080d1e]/95 p-5 shadow-lg backdrop-blur-xl transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-border pb-3.5">
        <div className="flex items-center gap-3">
          <span className={`grid size-11 place-items-center rounded-2xl border border-border ${tone.bg} ${tone.text} shadow-sm`}>
            <Icon size={20} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-foreground">{agent.label}</p>
              <Badge className={`text-[9px] font-mono px-2 py-0.5 ${tone.badge}`}>{agent.short}</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{String(trace.decisionKind).replaceAll("_", " ")}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          <span>{String(trace.status).toUpperCase()}</span>
        </div>
      </div>

      {/* Rationale */}
      <div className="mt-4 rounded-xl border border-border bg-card/50 p-3">
        <p className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground">RATIONALE & POLICY</p>
        <p className="mt-1.5 text-xs leading-relaxed text-foreground">{trace.rationale}</p>
      </div>

      {/* Input / Output Grid */}
      <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card/50 p-3">
          <p className="text-[9px] font-mono font-bold tracking-[0.16em] text-muted-foreground">INPUT DATA SCOPE</p>
          <p className="mt-1.5 whitespace-pre-line text-xs font-mono leading-5 text-cyan-800 dark:text-cyan-100/90">{compact(trace.inputSummary) || "No input parameters"}</p>
        </div>
        <div className="rounded-xl border border-border bg-card/50 p-3">
          <p className="text-[9px] font-mono font-bold tracking-[0.16em] text-muted-foreground">OUTPUT CONTRACT</p>
          <p className="mt-1.5 whitespace-pre-line text-xs font-mono leading-5 text-emerald-800 dark:text-emerald-100/90">{compact(trace.outputSummary) || "Completed with zero output mutations"}</p>
        </div>
      </div>

      {/* Decision Intelligence Layer */}
      {decision ? (
        <div className="mt-3.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 dark:bg-cyan-950/30 p-3">
          <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold tracking-wider text-cyan-700 dark:text-cyan-300">
            <Zap size={11} />
            <span>DECISION INTELLIGENCE: {decision.layer}</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-foreground">
            <span className="font-semibold text-cyan-700 dark:text-cyan-200">{decision.selected} — </span>
            {decision.reason}
          </p>
        </div>
      ) : null}

      {/* Footer telemetry */}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[10px] text-muted-foreground font-mono">
        <span className="flex items-center gap-1.5">
          <Terminal size={12} className="text-muted-foreground" />
          <span>{trace.provenance?.length ?? 0} verified source references</span>
        </span>
        <span className="flex items-center gap-1.5 text-cyan-700 dark:text-cyan-300">
          <Clock size={12} />
          <span>Latency: {trace.latencyMs} ms</span>
        </span>
      </div>
    </section>
  );
}
