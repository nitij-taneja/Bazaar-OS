import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "wouter";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  AudioLines,
  BadgeCheck,
  Bot,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Clock3,
  Cpu,
  Database,
  Eye,
  FileSearch,
  Gift,
  Home as HomeIcon,
  ImagePlus,
  Layers,
  LockKeyhole,
  Mic,
  Moon,
  Network,
  Radio,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Sun,
  Terminal,
  TerminalSquare,
  Upload,
  Watch,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AgentName, AgentTracePanel, PipelineVisualizer } from "@/components/BazaarPipeline";
import { AgentActivityFeed } from "@/components/AgentActivityFeed";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";

const presetScenarios = [
  {
    icon: Watch,
    label: "Brother's Birthday Gift · Delhi",
    query: "I want an elegant minimalist black watch under ₹2500 for my brother's birthday with fast Delhi delivery",
    tone: "cyan",
  },
  {
    icon: Briefcase,
    label: "Leather Messenger Bag · Mumbai",
    query: "I need a durable formal leather messenger bag for office work under ₹3500 with Mumbai next-day delivery",
    tone: "violet",
  },
  {
    icon: Gift,
    label: "Silver Jewellery Gift · Bengaluru",
    query: "Looking for an elegant silver jewellery gift under ₹2000 for my sister with Bengaluru delivery",
    tone: "amber",
  },
  {
    icon: Bot,
    label: "External AI Buyer (A2A Quote)",
    query: "A2A Discovery: Query verified merchant catalog for watches under ₹3000 in Delhi and return a signed quote.",
    tone: "emerald",
    isA2A: true,
  },
];

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Razorpay Test Mode checkout could not be loaded."));
    document.body.appendChild(script);
  });
}

function currency(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
}

function ProductCard({ product, selected, onSelect }: { product: any; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`group relative overflow-hidden rounded-2xl border text-left transition-all duration-300 ${
        selected
          ? "border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-400/40 shadow-lg dark:border-cyan-400 dark:bg-cyan-950/30 dark:shadow-[0_0_30px_rgba(34,211,238,0.2)]"
          : "border-border bg-card/90 hover:border-cyan-500/30 hover:bg-card dark:border-white/10 dark:bg-[#0a0f22]/90 dark:hover:border-white/25 dark:hover:bg-[#0e162e]"
      }`}
    >
      <div className="relative h-40 overflow-hidden bg-slate-100 dark:bg-slate-950">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.title} className="size-full object-cover transition-transform duration-500 group-hover:scale-108" />
        ) : (
          <div className="grid size-full place-items-center text-slate-400 dark:text-slate-600">
            <ImagePlus />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-80" />
        <span className="absolute top-2.5 left-2.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 backdrop-blur-md">
          {product.testInventory} IN STOCK
        </span>
        {product.score ? (
          <span className="absolute top-2.5 right-2.5 rounded-full border border-cyan-500/30 bg-cyan-500/15 px-2 py-0.5 text-[9px] font-mono font-bold text-cyan-700 dark:bg-cyan-950/80 dark:text-cyan-300 backdrop-blur-md">
            Match {(product.score * 100).toFixed(0)}%
          </span>
        ) : null}
      </div>

      <div className="p-3.5">
        <p className="line-clamp-2 min-h-10 text-xs font-semibold leading-relaxed text-foreground group-hover:text-primary">
          {product.title}
        </p>
        <div className="mt-2.5 flex items-end justify-between gap-2 border-t border-border pt-2.5">
          <div>
            <p className="text-sm font-bold text-foreground font-mono">{currency(product.testPriceInrPaise)}</p>
            <p className="text-[9px] text-muted-foreground">NovaCart Verified SKU</p>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-semibold text-cyan-600 dark:text-cyan-300">
            <span>View</span>
            <ChevronRight size={13} />
          </div>
        </div>
      </div>
    </button>
  );
}

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState(presetScenarios[0].query);
  const [workspace, setWorkspace] = useState<"shop" | "mesh" | "audit" | "models" | "merchant">("shop");
  const [failureOutcome, setFailureOutcome] = useState<string | null>(null);
  const [channel, setChannel] = useState<"text" | "voice" | "image" | "a2a">("text");
  const [imageAttached, setImageAttached] = useState(false);
  const [imageAnalysis, setImageAnalysis] = useState<any>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [agentAudioUrl, setAgentAudioUrl] = useState<string | null>(null);
  const [activeAgent, setActiveAgent] = useState<AgentName | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentName>("intent");
  const [run, setRun] = useState<any>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [deliveryName, setDeliveryName] = useState("Rohan Sharma");
  const [deliveryPhone, setDeliveryPhone] = useState("+91 98765 43210");
  const [deliveryStreet, setDeliveryStreet] = useState("Flat 402, Lotus Towers, 14th Main Road");
  const [deliveryCity, setDeliveryCity] = useState("Delhi - 110001");
  const [mandateConsentGiven, setMandateConsentGiven] = useState(true);
  const [orderSuccess, setOrderSuccess] = useState<{
    orderId: number;
    razorpayPaymentId: string;
    razorpayOrderId: string;
    amountInrPaise: number;
    productTitle: string;
    deliveryName: string;
    deliveryStreet: string;
    deliveryCity: string;
    deliveryPhone: string;
    time: string;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const timers = useRef<number[]>([]);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const audioChunks = useRef<Blob[]>([]);
  const imageInput = useRef<HTMLInputElement | null>(null);

  const overview = trpc.commerce.overview.useQuery();
  const merchantCatalog = trpc.commerce.merchantCatalog.useQuery(undefined, { enabled: workspace === "merchant", retry: false });

  const runMutation = trpc.commerce.run.useMutation({
    onSuccess: data => {
      setRun(data);
      setOrderSuccess(null);
      setSelectedProductId(data.candidates?.[0]?.id ?? null);
      timers.current.forEach(window.clearTimeout);
      data.traces.forEach((trace: any, index: number) => {
        timers.current.push(
          window.setTimeout(() => {
            setActiveAgent(trace.agentName);
            setSelectedAgent(trace.agentName);
          }, index * 520)
        );
      });
      timers.current.push(window.setTimeout(() => setActiveAgent(null), data.traces.length * 520 + 280));
    },
    onError: error => setNotice(error.message),
  });

  const verifyPaymentMutation = trpc.commerce.verifyCheckoutPayment.useMutation({
    onSuccess: (_data: any, variables: any) => {
      setNotice("Razorpay payment signature verified. BazaarOS marked order paid and wrote cryptographic audit receipt.");
      setOrderSuccess({
        orderId: variables.orderId,
        razorpayPaymentId: variables.razorpayPaymentId,
        razorpayOrderId: variables.razorpayOrderId,
        amountInrPaise: run?.mandate?.amountInrPaise ?? 219900,
        productTitle: selectedProduct?.title ?? "NovaCart Curated Product",
        deliveryName,
        deliveryStreet,
        deliveryCity,
        deliveryPhone,
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      });
    },
    onError: error => setNotice(`Payment response was not accepted: ${error.message}`),
  });

  const openTestCheckout = async (data: any) => {
    try {
      await loadRazorpayCheckout();
      if (!window.Razorpay) throw new Error("Razorpay checkout script failed to load.");
      const checkout = new window.Razorpay({
        key: data.razorpayKeyId,
        amount: data.amountInrPaise,
        currency: "INR",
        name: data.merchantName,
        description: "BazaarOS Bounded Test-Mode Checkout",
        order_id: data.razorpayOrderId,
        theme: { color: "#22d3ee" },
        handler: (response: any) =>
          verifyPaymentMutation.mutate({
            orderId: data.orderId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          }),
        modal: { ondismiss: () => setNotice("Checkout closed. Cart remains preserved; no automatic retry.") },
      });
      checkout.open();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to open Razorpay Test Mode checkout.");
    }
  };

  const approveMandateMutation = trpc.commerce.approveMandate.useMutation({
    onSuccess: data => {
      setNotice(`Mandate approved! Razorpay Test Order ${data.razorpayOrderId} created.`);
      void openTestCheckout(data);
    },
    onError: error => setNotice(error.message),
  });

  const approveMutation = {
    isPending: approveMandateMutation.isPending,
    mutate: ({ mandateId }: { mandateId: number }) => {
      const confirmationToken = run?.mandate?.confirmationToken;
      if (!confirmationToken) return setNotice("This mandate has no valid confirmation capability. Start a fresh run.");
      approveMandateMutation.mutate({ mandateId, confirmationToken });
    },
  };

  const testFailureMutation = trpc.commerce.simulateTestPaymentFailure.useMutation({
    onSuccess: data => {
      setFailureOutcome(data.message);
      setNotice(data.message);
    },
    onError: error => setNotice(error.message),
  });

  const updateInventoryMutation = trpc.commerce.updateInventory.useMutation({
    onSuccess: data => {
      void merchantCatalog.refetch();
      setNotice(`Protected inventory update saved for product ${data.productId}. Cache invalidated.`);
    },
    onError: error => setNotice(error.message),
  });

  const transcriptionMutation = trpc.commerce.transcribeVoice.useMutation({
    onSuccess: data => {
      setQuery(data.text);
      setIsRecording(false);
      setNotice(`Whisper transcribed: "${data.text}"`);
    },
    onError: error => {
      setIsRecording(false);
      setNotice(error.message);
    },
  });

  const speechMutation = trpc.commerce.synthesizeBrief.useMutation({
    onSuccess: data => {
      setAgentAudioUrl(data.audioUrl);
      setNotice(data.decision.reason);
    },
    onError: error => setNotice(error.message),
  });

  const imageMutation = trpc.commerce.analyzeImageStyle.useMutation({
    onSuccess: data => {
      setImageAttached(true);
      setImageAnalysis(data);
      setNotice(`Vision extracted style tags: ${data.styleTags.join(", ")}`);
    },
    onError: error => {
      setImageAttached(false);
      setNotice(error.message);
    },
  });

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);
  useEffect(() => {
    if (workspace === "merchant") window.location.assign("/merchant");
  }, [workspace]);

  const products = run?.candidates?.length ? run.candidates : overview.data?.productPreview ?? [];
  const selectedProduct = products.find((item: any) => item.id === selectedProductId) ?? products[0];
  const selectedTrace = run?.traces?.find((item: any) => item.agentName === selectedAgent) ?? {
    agentName: "intent",
    status: "idle",
    decisionKind: "ready_for_input",
    rationale: "Pipeline is standing by. Choose a preset or type a Hinglish request to launch the autonomous mesh.",
    inputSummary: { input: "waiting" },
    outputSummary: { output: "none" },
    provenance: [],
    latencyMs: 0,
  };

  const decisionKey = selectedAgent === "catalog" ? "retrieval" : selectedAgent === "trust" ? "payment" : selectedAgent === "intent" ? "model" : "";
  const selectedDecision = run?.decisionIntelligence?.find((item: any) => item.layer.toLowerCase().includes(decisionKey));

  const doRun = (customQuery?: string) => {
    const textToRun = customQuery ?? query;
    if (textToRun.trim().length < 3) return setNotice("Please describe what you are looking for before starting the agent mesh.");
    setNotice(null);
    setFailureOutcome(null);
    runMutation.mutate({
      query: textToRun,
      channel,
      includeImage: imageAttached,
      imageStyleTags: imageAnalysis?.styleTags,
      authorityScope: channel === "a2a" ? "SEARCH_AND_QUOTE_ONLY" : "HUMAN_PRESENT_CONFIRMATION_REQUIRED",
    });
  };

  const selectPreset = (preset: (typeof presetScenarios)[number]) => {
    setQuery(preset.query);
    if (preset.isA2A) {
      setChannel("a2a");
      setWorkspace("shop");
      setNotice("External AI Buyer Agent simulation mode selected (SEARCH_AND_QUOTE_ONLY authority).");
    } else {
      setChannel("text");
    }
    doRun(preset.query);
  };

  const toggleRecording = async () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : undefined });
      audioChunks.current = [];
      recorder.ondataavailable = event => {
        if (event.data.size) audioChunks.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(audioChunks.current, { type: recorder.mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => typeof reader.result === "string" && transcriptionMutation.mutate({ audioDataUrl: reader.result });
        reader.readAsDataURL(blob);
      };
      mediaRecorder.current = recorder;
      recorder.start();
      setIsRecording(true);
      setNotice("Recording audio... click mic again to transcribe with Whisper.");
    } catch {
      setNotice("Microphone permission is required for voice input.");
    }
  };

  const startLiveVoiceInput = () => {
    if (isRecording) {
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch {}
      }
      if (mediaRecorder.current) {
        try { mediaRecorder.current.stop(); } catch {}
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "en-IN";
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.onstart = () => {
          setIsRecording(true);
          setNotice("Listening in real-time... speak your request now!");
        };
        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript) {
            setQuery(transcript);
          }
        };
        recognition.onerror = () => {
          setIsRecording(false);
        };
        recognition.onend = () => {
          setIsRecording(false);
          setNotice("Speech recognized! Tap 'Run Mesh' or Enter to search.");
        };
        speechRecognitionRef.current = recognition;
        recognition.start();
        return;
      } catch {
        // Fallback to MediaRecorder
      }
    }

    toggleRecording();
  };

  const removeAttachedImage = () => {
    setImageAttached(false);
    setImageAnalysis(null);
    if (imageInput.current) imageInput.current.value = "";
  };

  const speakAgentSummary = () => {
    const lead = run?.candidates?.[0];
    const summary = lead
      ? `I found ${lead.title}. It is within the reviewed budget and available for the selected delivery area. Please review the mandate before checkout.`
      : "BazaarOS is ready to help you discover a verified merchant catalog.";
    speechMutation.mutate({ text: summary.slice(0, 200) });
  };

  const selectImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png|webp)$/) || file.size > 8 * 1024 * 1024) {
      return setNotice("Use a JPEG, PNG, or WebP style reference up to 8 MB.");
    }
    const reader = new FileReader();
    reader.onloadend = () => typeof reader.result === "string" && imageMutation.mutate({ imageDataUrl: reader.result });
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-cyan-500 selection:text-black transition-colors duration-300">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-[1540px] items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 group cursor-pointer">
            <div className="grid size-10 place-items-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-300 shadow-[0_0_25px_rgba(34,211,238,0.25)] group-hover:scale-105 transition-transform">
              <Zap size={20} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight text-foreground">Bazaar<span className="text-cyan-500 dark:text-cyan-400">OS</span></span>
                <span className="rounded-full bg-cyan-500/10 dark:bg-cyan-400/10 px-2 py-0.5 text-[9px] font-mono font-bold text-cyan-600 dark:text-cyan-300">Studio</span>
              </div>
              <p className="text-[9px] font-bold tracking-[0.16em] text-muted-foreground">MERCHANT-TO-AGENT COMMERCE GATEWAY</p>
            </div>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft size={13} className="mr-1.5" /> Landing Page
              </Button>
            </Link>

            {/* Dark/Light Mode Switcher */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="size-9 rounded-xl border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground shadow-sm transition-all"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? (
                <Sun size={17} className="text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
              ) : (
                <Moon size={17} className="text-sky-600 transition-transform duration-300 rotate-0 hover:-rotate-12" />
              )}
            </Button>

            <Badge className="hidden border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 sm:flex">
              <span className="mr-1.5 size-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              RAZORPAY TEST MODE
            </Badge>

          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-[1540px] px-4 py-6 sm:px-6 lg:py-8">
        {/* Hero Section & Live Telemetry Banner */}
        <section className="mb-6 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-cyan-500/30 bg-cyan-500/10 text-[11px] font-semibold text-cyan-700 dark:text-cyan-200 dark:border-cyan-400/30 dark:bg-cyan-400/10 shadow-sm">
                <Activity size={13} className="mr-1.5 text-cyan-600 dark:text-cyan-300 animate-pulse" /> NPCI UAP / ACP / AP2 PROTOCOL GATEWAY
              </Badge>
              <span className="text-[11px] font-mono text-muted-foreground">Razorpay Hiring Track 01 · AI Growth & Agentic Commerce</span>
            </div>

            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-[42px] lg:leading-[1.15]">
              Make any merchant sellable to{" "}
              <span className="bg-gradient-to-r from-cyan-600 via-sky-600 to-emerald-600 dark:from-cyan-300 dark:via-sky-200 dark:to-emerald-300 bg-clip-text text-transparent">
                AI Buyer Agents & Human Shoppers.
              </span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Deterministic Trust Gateway • Hybrid BGE 384D Vector RAG • Groq Llama 3 Preference Extractor • Signed Razorpay Checkout & Webhook Ledger.
            </p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-xl">
            <div className="bg-card px-5 py-4 backdrop-blur-xl">
              <p className="text-2xl font-mono font-extrabold text-foreground tracking-tight">
                {overview.isLoading ? <span className="inline-block h-6 w-10 animate-pulse rounded bg-muted" /> : overview.data?.productCount ?? 26}
              </p>
              <p className="text-[9px] font-mono font-bold tracking-[0.18em] text-muted-foreground mt-0.5">STORE SKUS</p>
            </div>
            <div className="bg-card px-5 py-4 backdrop-blur-xl">
              <p className="text-2xl font-mono font-extrabold text-cyan-600 dark:text-cyan-300 tracking-tight">7</p>
              <p className="text-[9px] font-mono font-bold tracking-[0.18em] text-muted-foreground mt-0.5">AUTONOMOUS NODES</p>
            </div>
            <div className="bg-card px-5 py-4 backdrop-blur-xl">
              <p className="text-2xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">100%</p>
              <p className="text-[9px] font-mono font-bold tracking-[0.18em] text-muted-foreground mt-0.5">GATED PAYMENTS</p>
            </div>
          </div>
        </section>

        {/* Active Merchant Identity & Protocol Capabilities Showcase */}
        <section className="mb-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 via-sky-500/5 to-emerald-500/10 dark:from-cyan-950/40 dark:via-slate-900/40 dark:to-emerald-950/30 p-4.5 backdrop-blur-xl shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-cyan-500/40 bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 shadow-xs">
                <Store size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">ACTIVE MERCHANT SHOWCASE</span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-mono font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">AI TRANSACTABLE</span>
                </div>
                <h2 className="text-lg font-extrabold text-foreground tracking-tight">
                  NovaCart <span className="text-xs font-normal text-muted-foreground">— Premium Lifestyle & Fashion Retailer</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enabled by BazaarOS: Transactable across human shoppers & autonomous AI buyers on Razorpay Test Mode.
                </p>
              </div>
            </div>

            {/* 6 Protocol Capabilities */}
            <div className="flex flex-wrap items-center gap-1.5 max-w-xl">
              {[
                "✓ AI-Readable Catalog (UAP/ACP)",
                "✓ Real-Time Search & Quote",
                "✓ Dynamic Bundles (+18% AOV)",
                "✓ Bounded Agent Checkout",
                "✓ Razorpay Payment Gateway",
                "✓ SHA-256 Audit Trail",
              ].map(cap => (
                <span
                  key={cap}
                  className="rounded-lg border border-border bg-card/85 px-2.5 py-1 text-[10px] font-mono font-bold text-foreground shadow-2xs"
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Interactive Scenario Quick-Launcher (User friendly) */}
        <section className="mb-6 rounded-2xl border border-border bg-card/80 p-3.5 backdrop-blur-xl shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-cyan-600 dark:text-cyan-300" />
              <span className="text-xs font-bold text-foreground">Test Drive NovaCart AI Commerce Scenarios:</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Click any scenario to test the multi-agent mesh</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {presetScenarios.map((preset, index) => {
              const Icon = preset.icon;
              return (
                <button
                  key={index}
                  onClick={() => selectPreset(preset)}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card/50 p-2.5 text-left transition-all hover:border-cyan-500/40 hover:bg-cyan-500/5 group shadow-xs"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-muted/60 text-cyan-600 dark:text-cyan-300 group-hover:bg-cyan-500 group-hover:text-white dark:group-hover:text-black transition-colors">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-300 truncate">{preset.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{preset.query}</p>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-300 shrink-0" />
                </button>
              );
            })}
          </div>
        </section>



        {/* Core Workspace: Multimodal Input + Live Mesh + Telemetry */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.48fr)_minmax(360px,0.8fr)]">
          <div className="space-y-6">
            {/* Unified AI Multimodal Search & Chat Panel */}
            <section className="rounded-[26px] border border-border bg-card/90 p-5 shadow-lg backdrop-blur-2xl">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="grid size-7 place-items-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold tracking-wide text-foreground uppercase">AI Multimodal Search & Intent Panel</h3>
                    <p className="text-[11px] text-muted-foreground">Type in natural English, speak via microphone, or attach style reference images</p>
                  </div>
                </div>

                {/* A2A Mode Indicator & Toggle */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const nextMode = channel === "a2a" ? "text" : "a2a";
                      setChannel(nextMode);
                      if (nextMode === "a2a") {
                        setNotice("External AI Buyer Agent simulation mode active (SEARCH_AND_QUOTE_ONLY authority).");
                      }
                    }}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                      channel === "a2a"
                        ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-400 shadow-xs"
                        : "border-border bg-muted/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Bot size={14} className={channel === "a2a" ? "text-emerald-600 dark:text-emerald-400" : ""} />
                    <span>{channel === "a2a" ? "A2A Buyer Mode (Active)" : "Simulate A2A Buyer"}</span>
                  </button>
                </div>
              </div>

              {/* Image Attachment Preview Chip (If attached) */}
              {imageAttached && imageAnalysis ? (
                <div className="mb-3 flex items-center justify-between rounded-xl border border-violet-500/30 bg-violet-500/10 p-2.5 text-xs text-violet-800 dark:text-violet-200">
                  <div className="flex items-center gap-2">
                    <ImagePlus size={15} className="text-violet-600 dark:text-violet-400" />
                    <span className="font-semibold">Style Reference Attached:</span>
                    <span className="font-mono text-[11px] text-violet-700 dark:text-violet-300">
                      {imageAnalysis.styleTags?.join(", ")}
                    </span>
                  </div>
                  <button
                    onClick={removeAttachedImage}
                    className="grid size-5 place-items-center rounded-md text-muted-foreground hover:bg-violet-500/20 hover:text-foreground"
                    title="Remove image"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : null}

              {/* Main Conversational Input Bar */}
              <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && doRun()}
                    placeholder="Describe what you want (e.g. I want an elegant minimalist black watch for my brother under ₹2500)..."
                    className="h-14 rounded-2xl border-input bg-background/60 pl-4 pr-24 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-cyan-500 shadow-inner"
                  />

                  {/* Input Action Cluster: Voice & Image */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={selectImage} />
                    <button
                      onClick={() => imageInput.current?.click()}
                      disabled={imageMutation.isPending}
                      className={`grid size-9 place-items-center rounded-xl transition-all ${
                        imageAttached
                          ? "bg-violet-500/20 text-violet-600 dark:text-violet-300 ring-1 ring-violet-400"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                      title={imageMutation.isPending ? "Analyzing..." : "Attach style reference image"}
                    >
                      {imageMutation.isPending ? <RefreshCw size={16} className="animate-spin" /> : <ImagePlus size={17} />}
                    </button>

                    <button
                      onClick={startLiveVoiceInput}
                      className={`grid size-9 place-items-center rounded-xl transition-all ${
                        isRecording
                          ? "bg-rose-500 text-white shadow-md animate-pulse"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                      title="Speak using microphone"
                    >
                      <Mic size={17} />
                    </button>
                  </div>
                </div>

                <Button
                  onClick={() => doRun()}
                  disabled={runMutation.isPending}
                  className="h-14 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 dark:from-cyan-400 dark:via-teal-400 dark:to-emerald-400 font-extrabold text-white dark:text-slate-950 hover:opacity-95 shadow-md hover:shadow-cyan-500/25 transition-all"
                >
                  {runMutation.isPending ? (
                    <RefreshCw className="animate-spin" size={18} />
                  ) : (
                    <>
                      <Zap size={18} className="mr-1.5 fill-current" />
                      <span>Run Mesh</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Live Voice Waveform / Listening Banner */}
              <AnimatePresence>
                {isRecording ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 overflow-hidden rounded-xl border border-rose-500/30 bg-rose-500/10 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="relative flex size-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full size-3 bg-rose-500"></span>
                      </span>
                      <p className="text-xs font-bold text-rose-700 dark:text-rose-300">
                        Listening in real-time... speak your request now!
                      </p>
                      <div className="ml-auto flex items-center gap-1">
                        {Array.from({ length: 16 }, (_, i) => (
                          <span
                            key={i}
                            className="w-1 rounded-full bg-rose-500 animate-pulse"
                            style={{
                              height: `${6 + ((i * 13) % 18)}px`,
                              animationDelay: `${i * 50}ms`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Audio Listen Output Bar (If run finished) */}
              {run?.candidates?.length ? (
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <button
                    onClick={speakAgentSummary}
                    disabled={speechMutation.isPending}
                    className="flex items-center gap-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    <AudioLines size={15} />
                    <span>{speechMutation.isPending ? "Generating audio brief..." : "🔊 Listen to Agent Spoken Recommendation"}</span>
                  </button>

                  {agentAudioUrl ? <audio controls src={agentAudioUrl} className="h-7 max-w-[200px]" autoPlay /> : null}
                </div>
              ) : null}
            </section>

            {/* Live Pipeline Visualizer (The Jarvis Mesh) */}
            <PipelineVisualizer traces={run?.traces ?? []} activeAgent={activeAgent} selectedAgent={selectedAgent} onSelect={setSelectedAgent} />

            {/* Live feed of any caller's real activity — browser, external script, or a genuine third-party agent */}
            <AgentActivityFeed />
          </div>

          {/* Right Column: Active Agent Trace + Trust Gateway */}
          <div className="space-y-6">
            <AgentTracePanel trace={selectedTrace} decision={selectedDecision} />

            {/* Deterministic Trust Gateway Cockpit */}
            <section className="rounded-[26px] border border-border bg-card/90 p-5 shadow-lg backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                    <LockKeyhole size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground uppercase">Trust Gateway Policy</p>
                    <p className="text-[10px] text-muted-foreground">100% Deterministic • Zero LLM Discretion</p>
                  </div>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[9px] font-mono">
                  GATED PROTOCOL
                </Badge>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                The Trust Gateway prevents money-loss bugs, hallucinations, and unauthorized agent charges by enforcing hard runtime gates:
              </p>

              <div className="mt-3.5 space-y-2">
                {[
                  { label: "Product Inventory Available", pass: Boolean(selectedProduct?.testInventory && selectedProduct.testInventory > 0) },
                  { label: "Delivery City Serviceable", pass: Boolean(selectedProduct?.deliveryCities?.length) },
                  { label: "Single Checkout Limit (≤ ₹5,000)", pass: Boolean(!run?.mandate || run.mandate.amountInrPaise <= 500000) },
                  { label: "Explicit Customer Confirmation", pass: Boolean(run?.mandate?.status === "approved") },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between rounded-xl border border-border bg-card/50 px-3 py-2.5">
                    <span className="text-xs text-foreground">{item.label}</span>
                    <span
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-mono font-bold ${
                        item.pass
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                      }`}
                    >
                      {item.pass ? <Check size={11} /> : <Clock3 size={11} />}
                      <span>{item.pass ? "PASSED" : "REQUIRED"}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Verified Candidates & Provenance Inspector */}
        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
          <div className="rounded-[26px] border border-border bg-card/90 p-5 shadow-lg backdrop-blur-2xl">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3.5">
              <div>
                <p className="text-xs font-bold text-foreground uppercase tracking-wide">NovaCart Store Catalog • Verified SKUs</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Ranked using BGE 384D Vector Embeddings + Deterministic Hard Filters</p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-600 dark:text-cyan-300">
                <Database size={13} />
                <span>26 Verified Records</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {products.slice(0, 3).map((product: any) => (
                <ProductCard key={product.id} product={product} selected={selectedProductId === product.id} onSelect={() => setSelectedProductId(product.id)} />
              ))}
            </div>
          </div>

          {/* Product Provenance Card */}
          <section className="rounded-[26px] border border-border bg-card/90 p-5 shadow-lg backdrop-blur-2xl">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <FileSearch size={16} className="text-violet-600 dark:text-violet-400" />
              <p className="text-xs font-bold text-foreground uppercase tracking-wide">NovaCart SKU Fact & Provenance</p>
            </div>

            {selectedProduct ? (
              <div className="mt-3.5">
                <p className="text-xs font-bold text-foreground line-clamp-2">{selectedProduct.title}</p>

                <div className="mt-3 space-y-2">
                  {selectedProduct.factRows?.slice(0, 4).map((fact: any) => (
                    <div key={`${fact.factKind}-${fact.factKey}`} className="rounded-xl border border-border bg-card/50 p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-foreground">{fact.factKey.replaceAll("_", " ")}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[8px] font-mono font-bold ${
                            fact.factKind === "source"
                              ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                              : fact.factKind === "operational_overlay"
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                              : "bg-violet-500/10 text-violet-700 dark:text-violet-300"
                          }`}
                        >
                          {fact.factKind.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground truncate">{fact.factValue}</p>
                    </div>
                  ))}
                </div>

                <a
                  href={selectedProduct.sourceUrl ?? "https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023"}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-cyan-600 dark:text-cyan-300 hover:underline"
                >
                  <span>Underlying catalog intelligence: McAuley Lab '23 dataset</span>
                  <ArrowRight size={12} />
                </a>
              </div>
            ) : (
              <p className="mt-5 text-xs text-muted-foreground">Run a search to inspect candidate provenance.</p>
            )}
          </section>
        </section>

        {/* Checkout Mandate & Safe Failure Execution Cockpit */}
        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
          {/* Decision Intelligence Architecture */}
          <section className="rounded-[26px] border border-border bg-card/90 p-5 shadow-lg backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <p className="text-xs font-bold text-foreground uppercase tracking-wide">Architectural Decision Log</p>
                <p className="text-[10px] text-muted-foreground">First-principles justification behind every layer</p>
              </div>
              <CircleDollarSign size={18} className="text-cyan-600 dark:text-cyan-300" />
            </div>

            <div className="mt-3.5 space-y-2">
              {(
                run?.decisionIntelligence ?? [
                  {
                    layer: "Model Route",
                    selected: "Groq Llama 3 (JSON Mode)",
                    reason: "Narrow parameter extraction only; commercial facts and policy gates remain 100% deterministic.",
                    cache: "facts isolated",
                  },
                  {
                    layer: "Chunking Unit",
                    selected: "One Product Record (Atomic SKU)",
                    reason: "Product specs, provenance, inventory, and price overlays stay joined to prevent partial-token hallucination.",
                    cache: "catalog warm",
                  },
                  {
                    layer: "Embedding Engine",
                    selected: "BAAI/bge-small-en-v1.5 (384D)",
                    reason: "SOTA dense semantic matching combined with deterministic budget/city hard constraints.",
                    cache: "vector cache active",
                  },
                ]
              ).map((item: any) => (
                <div key={item.layer} className="rounded-xl border border-border bg-card/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-300 uppercase">{item.layer}</span>
                    <span className="text-[9px] font-mono text-muted-foreground">{item.cache}</span>
                  </div>
                  <p className="text-xs text-foreground mt-1">
                    <span className="font-bold">{item.selected}: </span>
                    {item.reason}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Checkout Mandate Box */}
          <section className="rounded-[26px] border border-emerald-500/25 bg-gradient-to-br from-emerald-500/5 to-card dark:from-emerald-950/30 dark:to-[#080d1e] p-5 shadow-lg backdrop-blur-2xl">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-xs font-bold text-foreground uppercase tracking-wide">Checkout Mandate & Shipping</p>
                  <p className="text-[10px] text-muted-foreground">Deterministic Intent Lock • Step-Up Gated</p>
                </div>
              </div>
              <Badge className={run?.mandate ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 text-[9px]" : "bg-muted text-muted-foreground text-[9px]"}>
                {orderSuccess ? "ORDER CONFIRMED" : run?.mandate ? "AWAITING HUMAN CONSENT" : "NO ACTIVE MANDATE"}
              </Badge>
            </div>

            {orderSuccess ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 space-y-3.5">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                  <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-500 text-slate-950 shadow-md">
                    <Check size={24} className="stroke-[3]" />
                  </div>
                  <h4 className="mt-2.5 text-base font-extrabold text-foreground">Order Placed Successfully!</h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 font-mono font-bold mt-0.5">
                    Order #NOVACART-{orderSuccess.orderId} · {currency(orderSuccess.amountInrPaise)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">Paid at {orderSuccess.time} via Razorpay Test Rails</p>
                </div>

                <div className="rounded-xl border border-border bg-card/60 p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Item Ordered:</span>
                    <span className="font-semibold text-foreground truncate max-w-[200px]">{orderSuccess.productTitle}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Deliver To:</span>
                    <span className="font-semibold text-foreground text-right">{orderSuccess.deliveryName} ({orderSuccess.deliveryPhone})</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Shipping Address:</span>
                    <span className="text-foreground text-right max-w-[210px] truncate">{orderSuccess.deliveryStreet}, {orderSuccess.deliveryCity}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Estimated Delivery:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">Tomorrow by 8:00 PM</span>
                  </div>
                  <div className="flex justify-between pt-1 text-[10px] font-mono text-muted-foreground">
                    <span>Razorpay ID: {orderSuccess.razorpayPaymentId}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">HMAC-SHA256 VERIFIED</span>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setOrderSuccess(null);
                    setRun(null);
                    setQuery("");
                  }}
                  variant="outline"
                  className="w-full h-11 rounded-xl border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                >
                  Start New Shopping Search
                </Button>
              </motion.div>
            ) : run?.mandate ? (
              <div className="mt-4 space-y-3.5">
                {/* Shipping Address Inputs */}
                <div className="rounded-xl border border-border bg-card/60 p-3 space-y-2">
                  <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">Delivery Shipping Details</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={deliveryName}
                      onChange={e => setDeliveryName(e.target.value)}
                      placeholder="Recipient Full Name"
                      className="h-8 text-xs bg-background/50"
                    />
                    <Input
                      value={deliveryPhone}
                      onChange={e => setDeliveryPhone(e.target.value)}
                      placeholder="Mobile Phone Number"
                      className="h-8 text-xs bg-background/50"
                    />
                  </div>
                  <Input
                    value={deliveryStreet}
                    onChange={e => setDeliveryStreet(e.target.value)}
                    placeholder="Street Address / Flat No."
                    className="h-8 text-xs bg-background/50"
                  />
                  <Input
                    value={deliveryCity}
                    onChange={e => setDeliveryCity(e.target.value)}
                    placeholder="City & PIN Code"
                    className="h-8 text-xs bg-background/50"
                  />
                </div>

                {/* Mandate Summary & Step-Up Alert */}
                <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Reviewed Cart Total:</span>
                    <span className="font-mono text-base font-bold text-foreground">{currency(run.mandate.amountInrPaise)}</span>
                  </div>
                  {run.mandate.amountInrPaise > 500000 ? (
                    <div className="mt-2 rounded-lg bg-amber-500/10 p-2 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/20">
                      ⚡ Step-Up Override: High-value transaction (&gt; ₹5,000) authorized by human customer.
                    </div>
                  ) : null}
                  <div className="mt-2 flex justify-between text-[10px] font-mono text-muted-foreground border-t border-border pt-2">
                    <span>Merchant: NovaCart</span>
                    <span>Valid for: 10 minutes</span>
                  </div>
                </div>

                {/* Mandate Consent Toggle */}
                <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={mandateConsentGiven}
                    onChange={e => setMandateConsentGiven(e.target.checked)}
                    className="rounded border-border accent-emerald-500"
                  />
                  <span>I authorize NovaCart to lock this test payment mandate via Razorpay Test Rails.</span>
                </label>

                <Button
                  onClick={() => approveMutation.mutate({ mandateId: run.mandate.id })}
                  disabled={approveMutation.isPending || !mandateConsentGiven}
                  className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-400 dark:to-teal-400 font-extrabold text-white dark:text-slate-950 hover:opacity-90 shadow-md transition-all"
                >
                  <LockKeyhole size={16} className="mr-2" /> Confirm & Open Razorpay Test Mode
                </Button>

                {/* Safe Failure Demo Trigger */}
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground">Test graceful failure handling:</span>
                    <Button
                      onClick={() =>
                        testFailureMutation.mutate({
                          mandateId: run.mandate.id,
                          confirmationToken: run.mandate.confirmationToken,
                        })
                      }
                      disabled={testFailureMutation.isPending}
                      variant="outline"
                      className="h-8 border-amber-500/30 bg-amber-500/10 text-[10px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                    >
                      <ShieldAlert size={12} className="mr-1.5" /> Simulate Safe Payment Failure
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Run the agent mesh first. A secure checkout mandate and delivery shipping card will appear once the Trust Gateway completes evaluation.
              </div>
            )}
          </section>
        </section>

        {/* Failure Handling Feedback Banner */}
        {failureOutcome ? (
          <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-xs font-bold text-amber-800 dark:text-amber-200">Graceful Failure Handled Securely</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-900/90 dark:text-amber-100/90">{failureOutcome}</p>
                <p className="mt-1.5 text-[10px] font-mono text-amber-700 dark:text-amber-300">
                  Cart preserved • No automatic retry • Fresh customer consent required.
                </p>
              </div>
            </div>
          </motion.section>
        ) : null}

        {/* Footer */}
        <footer className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 pb-12 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>
            Merchant: <span className="font-semibold text-foreground">NovaCart</span> enabled by <span className="font-semibold text-foreground">BazaarOS</span> • Catalog intelligence grounded in McAuley Lab '23 specifications.
          </p>
          <p className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
            <BadgeCheck size={14} /> Razorpay Test Mode Active • HMAC-SHA256 Signed
          </p>
        </footer>
      </main>

      {/* Floating Notification Toast */}
      <AnimatePresence>
        {notice ? (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[70] max-w-md rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
                <AudioLines size={16} />
              </div>
              <p className="pr-3 text-xs leading-relaxed text-foreground">{notice}</p>
              <button onClick={() => setNotice(null)} className="text-muted-foreground hover:text-foreground shrink-0">
                <X size={15} />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
