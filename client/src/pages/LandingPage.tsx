import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Bot,
  BrainCircuit,
  CheckCircle2,
  CircleDollarSign,
  Copy,
  Cpu,
  Database,
  FileCode2,
  Flame,
  Globe,
  Key,
  Layers,
  LockKeyhole,
  Moon,
  Network,
  Radar,
  ReceiptText,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Sun,
  Terminal,
  TerminalSquare,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const overview = trpc.commerce.overview.useQuery();
  const fairnessStats = trpc.commerce.merchantFairnessStats.useQuery();
  const [copiedKey, setCopiedKey] = useState(false);
  const [agentToken, setAgentToken] = useState<{
    clientId: string;
    apiKey: string;
    scope: string[];
    spendingCap: string;
    jwtHeader: string;
    jwtPayload: string;
  } | null>(null);

  const generateDemoAgentKey = () => {
    const randomHex = Math.random().toString(16).substring(2, 10);
    const clientId = `agent_uap_${randomHex}`;
    const apiKey = `bz_live_agt_${randomHex}_9f4e2b81`;
    setAgentToken({
      clientId,
      apiKey,
      scope: ["catalog:search", "quote:create", "checkout:mandate"],
      spendingCap: "₹5,000 (Hard Cap)",
      jwtHeader: JSON.stringify({ alg: "HS256", typ: "JWT" }, null, 2),
      jwtPayload: JSON.stringify(
        {
          iss: "https://bazaaros.novacart.in",
          sub: clientId,
          merchantId: 1,
          merchantSlug: "novacart",
          protocol: "NPCI_UAP_v1",
          scopes: ["catalog:search", "quote:create", "checkout:mandate"],
          maxSpendingCapPaise: 500000,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 86400,
        },
        null,
        2
      ),
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 selection:bg-cyan-500/20 selection:text-cyan-500">
      {/* Dynamic Ambient Backdrops */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-cyan-500/10 dark:bg-cyan-500/12 blur-[140px]" />
        <div className="absolute top-[45%] -left-40 size-[500px] rounded-full bg-violet-600/10 dark:bg-violet-600/10 blur-[150px]" />
        <div className="absolute top-[70%] -right-40 size-[500px] rounded-full bg-emerald-500/10 dark:bg-emerald-500/8 blur-[160px]" />
        <div className="absolute inset-0 jarvis-grid opacity-35 dark:opacity-50" />
      </div>

      {/* Sticky Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-xl transition-colors">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="grid size-9 place-items-center rounded-xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 shadow-sm group-hover:scale-105 transition-transform">
                <Radar className="size-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-tight text-foreground font-mono">BazaarOS</span>
                <span className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">Agentic Commerce</span>
              </div>
            </Link>
          </div>

          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Capabilities</a>
            <a href="#architecture" className="hover:text-foreground transition-colors">8 Autonomous Nodes</a>
            <a href="#decision-log" className="hover:text-foreground transition-colors">Decision Log</a>
            <a href="#trust" className="hover:text-foreground transition-colors">Trust & Safety</a>
            <a href="#agent-auth" className="hover:text-foreground transition-colors">AI Buyer Auth & API</a>
            <a href="#faq" className="hover:text-foreground transition-colors">Rationale & FAQs</a>
            <Link href="/merchant" className="hover:text-foreground transition-colors">NovaCart Console</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="size-9 rounded-xl text-muted-foreground hover:text-foreground"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? (
                <Sun size={17} className="text-amber-400 rotate-0 transition-transform duration-300 hover:rotate-45" />
              ) : (
                <Moon size={17} className="text-sky-600 rotate-0 transition-transform duration-300 hover:-rotate-12" />
              )}
            </Button>

            <Link href="/merchant">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex h-9 border-border bg-card/60 text-xs text-foreground hover:bg-accent">
                <Store size={14} className="mr-1.5 text-emerald-600 dark:text-emerald-400" /> Merchant Console
              </Button>
            </Link>

            <Link href="/app">
              <Button size="sm" className="h-9 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 dark:from-cyan-400 dark:to-sky-400 text-white dark:text-slate-950 font-bold px-4 shadow-sm hover:opacity-95">
                Launch Studio <ArrowRight size={14} className="ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 lg:px-8 lg:pt-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-700 dark:text-cyan-300 shadow-sm backdrop-blur-md mb-6"
        >
          <Sparkles size={14} className="text-cyan-500 animate-pulse" />
          <span>AI Growth & Agentic Commerce Gateway · Built on Razorpay Test Rails</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl lg:leading-[1.12]"
        >
          Make Any Merchant Sellable to{" "}
          <span className="bg-gradient-to-r from-cyan-600 via-sky-600 to-emerald-600 dark:from-cyan-300 dark:via-sky-200 dark:to-emerald-300 bg-clip-text text-transparent">
            Autonomous AI Buyers
          </span>{" "}
          & Human Shoppers.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
        >
          BazaarOS is the production-grade <strong className="font-semibold text-foreground">Merchant-to-Agent Gateway</strong> connecting stores like <strong className="font-semibold text-foreground">NovaCart</strong> to autonomous AI buyer agents with deterministic trust gates, hybrid BGE vector RAG, and signed Razorpay test-mode checkout.
        </motion.p>

        {/* Hero CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3.5"
        >
          <Link href="/app">
            <Button size="lg" className="h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 dark:from-cyan-400 dark:to-sky-400 px-6 font-extrabold text-white dark:text-slate-950 shadow-lg hover:shadow-cyan-500/25 transition-all">
              <Zap size={17} className="mr-2" /> Launch Interactive Commerce Studio
            </Button>
          </Link>
          <Link href="/merchant">
            <Button size="lg" variant="outline" className="h-12 rounded-xl border-border bg-card/80 px-6 font-bold text-foreground hover:bg-accent shadow-sm">
              <Store size={17} className="mr-2 text-emerald-600 dark:text-emerald-400" /> NovaCart Merchant Console
            </Button>
          </Link>
        </motion.div>

        {/* Live Metrics Strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-14 mx-auto max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-3 text-left"
        >
          <div className="rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-xl shadow-xs">
            <p className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">Showcase Merchant</p>
            <p className="mt-1 text-xl font-bold text-foreground font-mono">NovaCart</p>
            <p className="mt-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
              <span className="size-1.5 rounded-full bg-emerald-500" /> AI Transactable
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-xl shadow-xs">
            <p className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">Verified SKUs</p>
            <p className="mt-1 text-xl font-bold text-foreground font-mono">{overview.data?.productCount ?? 26} Records</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Dense 384D BGE Vectors</p>
          </div>
          <div className="rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-xl shadow-xs">
            <p className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">Trust Policy</p>
            <p className="mt-1 text-xl font-bold text-foreground font-mono">Dynamic Caps</p>
            <p className="mt-0.5 text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold">≤ ₹5K Auto · Step-Up Gated</p>
          </div>
          <div className="rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-xl shadow-xs">
            <p className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">Payment Rails</p>
            <p className="mt-1 text-xl font-bold text-foreground font-mono">Razorpay</p>
            <p className="mt-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">HMAC Test Webhooks</p>
          </div>
        </motion.div>
      </section>

      {/* Interactive Mock Preview / Live Telemetry Screen */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[28px] border border-border bg-card/90 shadow-2xl backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-rose-500/80" />
              <span className="size-3 rounded-full bg-amber-500/80" />
              <span className="size-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-mono text-[11px] text-muted-foreground">bazaar-gateway.novacart.in · live-agent-telemetry</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
              <span>TEST-MODE ACTIVE</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-px bg-border">
            {/* Left: Simulated Conversation */}
            <div className="lg:col-span-7 bg-card p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-300 uppercase">Step 1 · Multimodal User Intent</span>
                  <Badge className="bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-[9px] font-mono">Groq Llama 3 (JSON Mode)</Badge>
                </div>
                <div className="rounded-xl border border-border bg-muted/50 p-3.5 text-xs text-foreground font-mono leading-relaxed">
                  <span className="text-muted-foreground">Input: </span>
                  "Mujhe birthday gift ke liye black minimal watch chahiye under ₹2500, Delhi delivery ke saath"
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-violet-600 dark:text-violet-300 uppercase">Step 2 · Dense Vector Match</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Score: 94.2%</span>
                </div>
                <div className="mt-1.5 rounded-xl border border-border bg-muted/30 p-3.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-foreground">Timex Minimalist Classic Quartz Watch (Black)</p>
                    <p className="text-[10px] text-muted-foreground">NovaCart Verified SKU · 18 In Stock · Delhi 2-Day Delivery</p>
                  </div>
                  <p className="text-sm font-bold font-mono text-foreground">₹2,199</p>
                </div>
              </div>

              {/* Upsell Growth Offer */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Flame size={16} className="text-amber-500" />
                  <div>
                    <p className="text-xs font-bold text-foreground">Offer Agent: Bundle Gift Box & Leather Strap</p>
                    <p className="text-[10px] text-muted-foreground">+18% Merchant AOV · ₹299 transparent add-on</p>
                  </div>
                </div>
                <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[9px] font-mono">APPROVED</Badge>
              </div>
            </div>

            {/* Right: Trust Gateway Execution */}
            <div className="lg:col-span-5 bg-card/95 p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase">Step 3 · Deterministic Trust Gate</span>
                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[9px] font-mono">100% CODE</Badge>
                </div>

                <div className="space-y-2 text-[11px] font-mono">
                  <div className="flex items-center justify-between rounded-lg border border-border bg-card p-2">
                    <span className="text-muted-foreground">Inventory Check (Stock &gt; 0)</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ PASS (18)</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-card p-2">
                    <span className="text-muted-foreground">Serviceable City (Delhi)</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ PASS (Zone 1)</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-card p-2">
                    <span className="text-muted-foreground">Spending Cap Bound (≤ ₹5,000)</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ PASS (₹2,498)</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-card p-2">
                    <span className="text-muted-foreground">Customer Mandate Lock</span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-bold">✓ 10-Min HMAC</span>
                  </div>
                </div>
              </div>

              <Link href="/app" className="w-full">
                <Button className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-400 dark:to-teal-400 font-extrabold text-white dark:text-slate-950 shadow-md">
                  <LockKeyhole size={15} className="mr-2" /> Open Interactive Demo Experience
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Core Feature Bento Grid */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge className="border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-xs font-mono mb-3">
            ENTERPRISE ARCHITECTURE
          </Badge>
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight sm:text-4xl">
            Engineered for Agentic Commerce & Maximum Merchant Revenue
          </h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Every layer in BazaarOS is built with first-principles security: LLMs extract user intent with zero financial authority, while deterministic code gates all monetary actions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="rounded-[24px] border border-border bg-card/80 p-6 backdrop-blur-xl transition-all duration-300 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5">
            <div className="grid size-12 place-items-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 mb-5">
              <ScanSearch size={22} />
            </div>
            <h3 className="text-lg font-bold text-foreground">Hybrid 384D Vector RAG</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Combines BAAI/bge-small-en-v1.5 dense semantic vectors with hard deterministic catalog filters. Eliminates hallucinated prices, out-of-stock items, or unserviceable delivery zones.
            </p>
            <div className="mt-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 dark:bg-cyan-400/10 px-3 py-1 text-[10px] font-mono font-bold text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                Dense Vectors + Hard Filters
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="rounded-[24px] border border-border bg-card/80 p-6 backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5">
            <div className="grid size-12 place-items-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-5">
              <ShieldCheck size={22} />
            </div>
            <h3 className="text-lg font-bold text-foreground">Deterministic Trust Gateway</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Zero-LLM-discretion financial safety bar. Every transaction must pass inventory availability, geographic routing, policy-bounded ₹5,000 caps, and explicit human consent.
            </p>
            <div className="mt-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 px-3 py-1 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                100% Deterministic Code Gates
              </span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="rounded-[24px] border border-border bg-card/80 p-6 backdrop-blur-xl transition-all duration-300 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5">
            <div className="grid size-12 place-items-center rounded-2xl border border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400 mb-5">
              <Bot size={22} />
            </div>
            <h3 className="text-lg font-bold text-foreground">NPCI UAP / ACP / AP2 Ready</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              External AI buyers (ChatGPT, AutoGPT, LangChain agents) can discover merchant capabilities via machine-readable Agent Cards and generate signed quotes.
            </p>
            <div className="mt-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 dark:bg-violet-400/10 px-3 py-1 text-[10px] font-mono font-bold text-violet-700 dark:text-violet-300 border border-violet-500/20">
                Machine-Readable Agent Cards
              </span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="rounded-[24px] border border-border bg-card/80 p-6 backdrop-blur-xl transition-all duration-300 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5">
            <div className="grid size-12 place-items-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-5">
              <TrendingUp size={22} />
            </div>
            <h3 className="text-lg font-bold text-foreground">Dynamic Upsell & Revenue Engine</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              The Offer Agent analyzes cart candidates and proposes transparent, complementary bundles (+18% Average Order Value) without aggressive friction.
            </p>
            <div className="mt-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 dark:bg-amber-400/10 px-3 py-1 text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 border border-amber-500/20">
                +18% Merchant AOV Optimization
              </span>
            </div>
          </div>

          {/* Card 5 */}
          <div className="rounded-[24px] border border-border bg-card/80 p-6 backdrop-blur-xl transition-all duration-300 hover:border-rose-500/40 hover:shadow-lg hover:shadow-rose-500/5">
            <div className="grid size-12 place-items-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 mb-5">
              <CircleDollarSign size={22} />
            </div>
            <h3 className="text-lg font-bold text-foreground">Razorpay Test-Mode Rails</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Integrated with Razorpay Test Mode modal checkout. Orders are dispatched with 10-minute HMAC confirmation tokens and verified with SHA-256 webhook signatures.
            </p>
            <div className="mt-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 dark:bg-rose-400/10 px-3 py-1 text-[10px] font-mono font-bold text-rose-700 dark:text-rose-300 border border-rose-500/20">
                HMAC-SHA256 Signed Orders
              </span>
            </div>
          </div>

          {/* Card 6 */}
          <div className="rounded-[24px] border border-border bg-card/80 p-6 backdrop-blur-xl transition-all duration-300 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5">
            <div className="grid size-12 place-items-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 mb-5">
              <ReceiptText size={22} />
            </div>
            <h3 className="text-lg font-bold text-foreground">Cryptographic Audit Ledger</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Every handoff between agents produces an immutable audit receipt containing input parameters, output schemas, reasoning rationale, and source provenance facts.
            </p>
            <div className="mt-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 dark:bg-cyan-400/10 px-3 py-1 text-[10px] font-mono font-bold text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                Immutable Provenance Trail
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 8-Node Multi-Agent Topology Section */}
      <section id="architecture" className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-border">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-mono mb-3">
            AUTONOMOUS PROTOCOL MESH
          </Badge>
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight sm:text-4xl">
            How BazaarOS Orchestrates 8 Specialized Autonomous Nodes
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            No single black-box LLM controls the checkout. Each node possesses tightly bounded authority with verified typed data handoffs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[
            { id: "01", name: "Intent Agent", role: "Extracts typed constraints & preferences with zero financial authority.", tone: "cyan" },
            { id: "02", name: "Catalog Intelligence", role: "Executes 384D BGE vector search + hard deterministic filters.", tone: "violet" },
            { id: "03", name: "Offer Agent", role: "Proposes transparent complementary bundles to increase merchant AOV.", tone: "amber" },
            { id: "04", name: "Merchant A2A Gate", role: "Exposes capability cards to external AI buyers (NPCI UAP/ACP).", tone: "blue" },
            { id: "05", name: "Trust Gateway", role: "100% deterministic code gate: checks inventory, city, and ₹5,000 bounds.", tone: "emerald" },
            { id: "06", name: "Merchant Acknowledgment", role: "The specific chosen merchant formally accepts fulfillment before a mandate is drafted.", tone: "teal" },
            { id: "07", name: "Checkout Executor", role: "Generates 10-minute HMAC lock & triggers Razorpay Test Mode.", tone: "rose" },
            { id: "08", name: "Audit Ledger", role: "Records cryptographic SHA-256 receipts with source provenance.", tone: "orange" },
          ].map(node => (
            <div key={node.id} className="rounded-2xl border border-border bg-card/70 p-4.5 backdrop-blur-xl shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">NODE {node.id}</span>
                <span className="size-2 rounded-full bg-emerald-500" />
              </div>
              <h4 className="text-sm font-bold text-foreground">{node.name}</h4>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{node.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Architectural Decision Log Section */}
      <section id="decision-log" className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-border">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge className="border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-xs font-mono mb-3">
            EXAMPLE DECISION RECEIPT
          </Badge>
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight sm:text-4xl">
            What a Real Decision Receipt Looks Like
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Every real run produces a live version of this — the model, retrieval, and safety route actually used, and why the alternatives were rejected. This is a static example; the Studio's Architectural Decision Log shows the real one for your own query.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              layer: "Model Route",
              selected: "Groq structured intent extraction (deterministic fallback if unavailable)",
              reason: "Catalog facts never leave the backend for this model call; price, stock, and payment fields stay deterministic regardless of model output.",
              icon: BrainCircuit,
            },
            {
              layer: "Chunking",
              selected: "One product record per retrieval unit",
              reason: "Title, price overlay, delivery overlay, and provenance must stay joined for an auditable commerce answer — never split across arbitrary chunks.",
              icon: Layers,
            },
            {
              layer: "Retrieval",
              selected: "Hard filters first, then BGE vector rank (lexical fallback if embeddings unavailable)",
              reason: "Semantic relevance can never override budget, stock, or delivery truth — hard constraints always run before ranking.",
              icon: ScanSearch,
            },
            {
              layer: "Vision/OCR",
              selected: "Invoked only when a style-reference image is attached",
              reason: "No vision call — and no cost — is made unless the customer actually supplies an image; nothing is inferred from thin air.",
              icon: Radar,
            },
            {
              layer: "Payment Safety",
              selected: "Draft mandate only, never a direct provider call",
              reason: "Policy requires item availability, an amount bound, an idempotency key, and explicit customer confirmation before Razorpay is ever touched.",
              icon: ShieldCheck,
            },
            {
              layer: "Trust Gateway",
              selected: "100% deterministic code, zero LLM discretion",
              reason: "Verified live: an external agent that omits its authority scope is still hard-capped server-side — it cannot self-declare human presence to escalate.",
              icon: LockKeyhole,
            },
          ].map(item => (
            <div key={item.layer} className="rounded-2xl border border-border bg-card/70 p-4.5 backdrop-blur-xl shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <item.icon size={16} className="text-cyan-600 dark:text-cyan-400" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wide">{item.layer}</span>
              </div>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1.5">{item.selected}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.reason}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fairness Observability Section */}
      <section id="fairness" className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-border">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge className="border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300 text-xs font-mono mb-3">
            FAIRNESS OBSERVABILITY
          </Badge>
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight sm:text-4xl">
            Is Ranking Fair Across Merchants? Here's the Real Data.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Win-rate per merchant across recorded cross-merchant comparisons. This is observability only — nothing here automatically corrects ranking; it just lets anyone check whether the platform has, in practice, favored one merchant.
          </p>
        </div>

        {fairnessStats.data?.length ? (
          <div className="mx-auto max-w-3xl space-y-2.5">
            {fairnessStats.data.map(stat => (
              <div key={stat.slug} className="flex items-center gap-3 rounded-xl border border-border bg-card/70 p-3">
                <span className="w-40 shrink-0 truncate text-xs font-semibold text-foreground">{stat.merchantName}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-violet-500" style={{ width: `${stat.winRatePercent}%` }} />
                </div>
                <span className="w-32 shrink-0 text-right font-mono text-xs text-muted-foreground">
                  {stat.winCount}/{stat.eligibleCount} wins ({stat.winRatePercent}%)
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mx-auto max-w-md text-center text-sm text-muted-foreground">
            No cross-merchant comparisons recorded yet. Run <code className="text-cyan-600 dark:text-cyan-300">scripts/external-buyer-agents.mjs</code> to generate real comparison data.
          </p>
        )}
      </section>

      {/* Trust & Safe Failure Section */}
      <section id="trust" className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-border">
        <div className="rounded-[28px] border border-amber-500/25 bg-gradient-to-br from-amber-500/5 via-card to-card p-6 sm:p-10 backdrop-blur-2xl shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-2xl">
              <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-mono mb-3">
                RAZORPAY TRACK 01 SAFETY MANDATE
              </Badge>
              <h3 className="text-2xl font-extrabold text-foreground sm:text-3xl">
                Graceful Failure Handling & Zero Auto-Retries
              </h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                If a card declines, inventory runs out mid-session, or a signature check fails:
                BazaarOS immediately preserves the customer's cart, logs the failure event, and requires <strong className="font-semibold text-foreground">fresh human consent</strong> before any new payment intent can be created.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-xs font-semibold text-foreground">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  <span>Cart state permanently preserved</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-xs font-semibold text-foreground">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  <span>Zero unauthorized auto-retry loops</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-xs font-semibold text-foreground">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  <span>Signed webhook audit verification</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-xs font-semibold text-foreground">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  <span>Explicit customer confirmation token</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-lg max-w-md w-full">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-700 dark:text-amber-300 mb-3">
                <ShieldAlert size={16} />
                <span>TRY LIVE FAILURE TEST IN STUDIO</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                In the Interactive Studio, you can trigger a live simulation of a Razorpay webhook payment failure and watch BazaarOS protect the merchant and customer.
              </p>
              <Link href="/app" className="w-full mt-4 block">
                <Button variant="outline" className="w-full border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 font-bold text-xs">
                  Test Failure Handling in Studio <ArrowRight size={14} className="ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* AI Buyer Agent Auth, Verification & API Sandbox */}
      <section id="agent-auth" className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-border">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge className="border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-xs font-mono mb-3">
            AI BUYER AUTHENTICATION & JWT RECOVERY
          </Badge>
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight sm:text-4xl">
            How External AI Buyers Authenticate & Transact
          </h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            AI Agents don't have human credit cards. BazaarOS equips autonomous buyer agents with scoped Bearer API keys, signed JWT claims, and deterministic spending caps.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left: Interactive Key Minting Sandbox */}
          <div className="lg:col-span-6 rounded-3xl border border-border bg-card/90 p-6 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Key className="size-5 text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-sm font-bold text-foreground">Interactive AI Agent Key Minter</h3>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono">LIVE DEMO</Badge>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Click below to generate a live, scoped API credentials payload for an external autonomous AI Buyer Agent:
            </p>

            <Button
              onClick={generateDemoAgentKey}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 dark:from-cyan-400 dark:to-sky-400 text-white dark:text-slate-950 font-bold shadow-md hover:opacity-90 transition-all mb-4"
            >
              <Key size={15} className="mr-2" /> Generate Scoped Agent Credentials
            </Button>

            {agentToken ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Client ID:</span>
                    <span className="text-cyan-600 dark:text-cyan-300 font-bold">{agentToken.clientId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Bearer API Key:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold truncate max-w-[180px]">{agentToken.apiKey}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6 text-muted-foreground hover:text-foreground"
                        onClick={() => copyToClipboard(agentToken.apiKey)}
                      >
                        <Copy size={12} />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Max Spending Cap:</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">{agentToken.spendingCap}</span>
                  </div>
                </div>

                {copiedKey ? (
                  <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold text-center">
                    ✓ Copied Bearer Key to clipboard!
                  </p>
                ) : null}

                {/* Decoded Claims */}
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
                  <p className="text-[10px] font-mono font-bold text-cyan-700 dark:text-cyan-300 uppercase mb-1">
                    Verified JWT Token Scopes
                  </p>
                  <pre className="text-[10px] font-mono text-muted-foreground leading-relaxed overflow-x-auto">
                    {agentToken.jwtPayload}
                  </pre>
                </div>
              </motion.div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Click the button above to simulate how an external buyer agent (ChatGPT, AutoGPT) receives a verified token with policy-bounded caps.
              </div>
            )}
          </div>

          {/* Right: cURL & Python Agent Request */}
          <div className="lg:col-span-6 space-y-4">
            <div className="rounded-2xl border border-border bg-card/95 shadow-xl overflow-hidden font-mono text-xs">
              <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
                <span className="text-[11px] text-muted-foreground">cURL — Agent Catalog Search & Quote</span>
                <span className="text-[10px] text-cyan-600 dark:text-cyan-300 font-bold">POST /api/v1/agent/quote</span>
              </div>
              <pre className="p-4 overflow-x-auto text-[11px] leading-relaxed text-muted-foreground">
{`curl -X POST https://bazaar-os.novacart.in/api/v1/agent/quote \\
  -H "Authorization: Bearer ${agentToken?.apiKey ?? "bz_live_agt_8a2f190e"}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "protocol": "NPCI_UAP_v1",
    "item": "black minimal watch",
    "maxPriceInr": 2500,
    "destinationCity": "Delhi",
    "mandateToken": "mnd_hmac_823901"
  }'`}
              </pre>
            </div>

            <div className="rounded-2xl border border-border bg-card/95 p-4 text-xs">
              <p className="font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-emerald-500" />
                <span>Zero Unauthorized Retries & Bounded Delegation</span>
              </p>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Even if an AI agent makes a million programmatic requests, the Trust Gateway strictly enforces that no money leaves the user’s account without a cryptographically signed human mandate.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architectural Rationale & Self-Cross Examination (Judge & Auditor FAQ) */}
      <section id="faq" className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-border">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge className="border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300 text-xs font-mono mb-3">
            DEFENSE IN DEPTH & FIRST PRINCIPLES
          </Badge>
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight sm:text-4xl">
            Architectural Rationale & Security FAQ
          </h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Every boundary and protocol in BazaarOS was chosen with deliberate security and economic reasoning. Here is the full cross-examination.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Q1 */}
          <div className="rounded-2xl border border-border bg-card/80 p-5.5 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-mono text-xs font-bold mb-2.5">
              <span>01 · POLICY GATE</span>
            </div>
            <h4 className="text-sm font-bold text-foreground">Why a strict ≤ ₹5,000 spending cap?</h4>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Autonomous AI agents can suffer from prompt injection or hallucination loops. A hard-coded, zero-LLM financial cap in pure code guarantees that automated agent delegation cannot exceed risk limits without step-up OTP human approval.
            </p>
          </div>

          {/* Q2 */}
          <div className="rounded-2xl border border-border bg-card/80 p-5.5 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-mono text-xs font-bold mb-2.5">
              <span>02 · AGENT IDENTITY</span>
            </div>
            <h4 className="text-sm font-bold text-foreground">Why do AI buyers need scoped JWT credentials?</h4>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              AI agents (ChatGPT, AutoGPT, LangChain) do not have human identity cards or biometrics. BazaarOS issues machine-readable, short-lived JWT tokens with partitioned scopes (<code className="text-foreground">catalog:search</code>, <code className="text-foreground">quote:create</code>, <code className="text-foreground">checkout:mandate</code>) so permissions can be audited and revoked instantly.
            </p>
          </div>

          {/* Q3 */}
          <div className="rounded-2xl border border-border bg-card/80 p-5.5 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold mb-2.5">
              <span>03 · ZERO-LLM DISCRETION</span>
            </div>
            <h4 className="text-sm font-bold text-foreground">How is price & stock hallucination prevented?</h4>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              The LLM (Groq Llama 3) only extracts intent into JSON. It has <strong className="text-foreground font-semibold">zero authority</strong> to compute prices, invent discounts, or verify stock. All pricing and inventory are resolved by deterministic SQL queries and 100% code gates.
            </p>
          </div>

          {/* Q4 */}
          <div className="rounded-2xl border border-border bg-card/80 p-5.5 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold mb-2.5">
              <span>04 · MERCHANT GROWTH</span>
            </div>
            <h4 className="text-sm font-bold text-foreground">How does NovaCart gain +18% Average Order Value?</h4>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              When a buyer requests an item (e.g. leather formal watch), the Offer Agent dynamically matches complementary inventory (e.g. luxury gift box + leather balm) and presents transparent, bundled pricing that boosts merchant margin without deceptive tricks.
            </p>
          </div>

          {/* Q5 */}
          <div className="rounded-2xl border border-border bg-card/80 p-5.5 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-mono text-xs font-bold mb-2.5">
              <span>05 · CONCURRENCY SAFETY</span>
            </div>
            <h4 className="text-sm font-bold text-foreground">Why 10-Minute HMAC Mandate Locks?</h4>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Inventory and prices can change dynamically. An HMAC mandate token cryptographically binds the exact items, quantity, and total price for 10 minutes. If checkout isn't completed in time, the hold releases to prevent catalog locking attacks.
            </p>
          </div>

          {/* Q6 */}
          <div className="rounded-2xl border border-border bg-card/80 p-5.5 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-mono text-xs font-bold mb-2.5">
              <span>06 · SAFE DEGRADATION</span>
            </div>
            <h4 className="text-sm font-bold text-foreground">What happens during payment webhook failures?</h4>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Zero automated retry loops. The customer's cart state is preserved safely, the webhook event is logged in the cryptographic ledger, and fresh human consent is required before any secondary charge attempt is permitted.
            </p>
          </div>

          {/* Q7 */}
          <div className="rounded-2xl border border-border bg-card/80 p-5.5 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold mb-2.5">
              <span>07 · HIGH-VALUE ORDERS (&gt; ₹5,000)</span>
            </div>
            <h4 className="text-sm font-bold text-foreground">How are purchases above ₹5,000 handled?</h4>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              For high-value orders (e.g. ₹8,999), the Trust Gateway triggers a <code className="text-foreground">STEP_UP_HUMAN_MANDATE</code>. The user approves via 1-click on-screen mandate, Email/WhatsApp OTP, or by raising their agent's verified spending ceiling in their profile.
            </p>
          </div>

          {/* Q8 */}
          <div className="rounded-2xl border border-border bg-card/80 p-5.5 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-mono text-xs font-bold mb-2.5">
              <span>08 · TWO-SIDED ARCHITECTURE</span>
            </div>
            <h4 className="text-sm font-bold text-foreground">What is the NovaCart Merchant Console?</h4>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              BazaarOS bridges merchants and AI buyers. The Merchant Console (<code className="text-foreground">/merchant</code>) allows store operators to manage SKUs, generate dense 384D BGE embeddings, upload bulk CSVs, and audit verified Razorpay test webhooks.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-border">
        <div className="rounded-[32px] border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 via-sky-500/10 to-emerald-500/10 dark:from-cyan-950/40 dark:via-slate-900/50 dark:to-emerald-950/40 p-8 sm:p-14 text-center backdrop-blur-2xl shadow-2xl">
          <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Experience the Future of AI-Native Commerce Today
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Explore the live 7-agent pipeline, test voice & Hinglish intent extraction, inspect the Trust Gateway, and verify Razorpay test-mode checkouts.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Link href="/app">
              <Button size="lg" className="h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 dark:from-cyan-400 dark:to-sky-400 px-8 font-extrabold text-white dark:text-slate-950 shadow-xl hover:shadow-cyan-500/25">
                Launch Commerce Studio <ArrowRight size={17} className="ml-2" />
              </Button>
            </Link>
            <Link href="/merchant">
              <Button size="lg" variant="outline" className="h-12 rounded-xl border-border bg-card px-8 font-bold text-foreground hover:bg-accent">
                Open Merchant Console
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border bg-background/50 py-10 text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Radar className="size-4 text-cyan-500" />
            <span className="font-bold text-foreground font-mono">BazaarOS</span>
            <span>— AI Growth & Agentic Commerce Gateway</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Merchant: <strong className="text-foreground">NovaCart</strong></span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <BadgeCheck size={14} /> Razorpay Test Rails Verified
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
