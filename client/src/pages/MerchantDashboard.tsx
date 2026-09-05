import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, CircleAlert, Database, FileUp, PackagePlus, RefreshCw, Sparkles, TrendingDown, Upload, WalletCards } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";

type DraftProduct = { title: string; brand: string; description: string; imageUrl: string; priceInr: string; inventory: string; deliveryCities: string; deliveryEtaText: string; styleTags: string; occasionTags: string };
const emptyDraft: DraftProduct = { title: "", brand: "", description: "", imageUrl: "", priceInr: "", inventory: "1", deliveryCities: "Delhi", deliveryEtaText: "2–3 business days", styleTags: "minimal", occasionTags: "gift" };

const splitList = (value: string) => value.split(",").map(item => item.trim()).filter(Boolean);
const parseCsvLine = (line: string) => line.split(",").map(cell => cell.trim().replace(/^"|"$/g, ""));

function draftToRow(draft: DraftProduct) {
  return {
    title: draft.title.trim(),
    brand: draft.brand.trim() || undefined,
    description: draft.description.trim() || undefined,
    imageUrl: draft.imageUrl.trim() || undefined,
    priceInr: Number(draft.priceInr),
    inventory: Number(draft.inventory),
    deliveryCities: splitList(draft.deliveryCities),
    deliveryEtaText: draft.deliveryEtaText.trim(),
    styleTags: splitList(draft.styleTags),
    occasionTags: splitList(draft.occasionTags),
  };
}

function validateRow(row: ReturnType<typeof draftToRow>) {
  if (row.title.length < 2) return "Title must have at least 2 characters.";
  if (!Number.isFinite(row.priceInr) || row.priceInr <= 0) return "Price must be a positive INR amount.";
  if (!Number.isInteger(row.inventory) || row.inventory < 0) return "Inventory must be a whole number of zero or more.";
  if (!row.deliveryCities.length || !row.styleTags.length || !row.occasionTags.length) return "Delivery city, style tag, and occasion tag are required.";
  if (!row.deliveryEtaText) return "Delivery promise is required.";
  return null;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = { paid: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200", failed: "border-rose-300/30 bg-rose-300/10 text-rose-200", pending: "border-amber-300/30 bg-amber-300/10 text-amber-200", created: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100" };
  return <Badge className={colors[status] ?? "border-white/15 bg-white/5 text-slate-300"}>{status.toUpperCase()}</Badge>;
}

function MerchantWorkspace() {
  const [draft, setDraft] = useState<DraftProduct>(emptyDraft);
  const [csvRows, setCsvRows] = useState<ReturnType<typeof draftToRow>[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const catalog = trpc.commerce.merchantCatalog.useQuery();
  const paymentStatus = trpc.commerce.merchantPaymentStatus.useQuery(undefined, { refetchInterval: 8_000 });
  const utils = trpc.useUtils();
  const createProducts = trpc.commerce.createCatalogProducts.useMutation({
    onSuccess: data => { setMessage(`${data.created.length} product${data.created.length === 1 ? "" : "s"} added. ${data.created.filter(product => product.embedding === "indexed").length} received a real semantic vector immediately.`); setDraft(emptyDraft); setCsvRows([]); void utils.commerce.merchantCatalog.invalidate(); },
    onError: error => setMessage(error.message),
  });
  const reindex = trpc.commerce.reindexCatalog.useMutation({
    onSuccess: data => setMessage(`Semantic index refreshed with ${data.model}: ${data.indexed} products indexed${data.failedProductIds.length ? `; ${data.failedProductIds.length} need retry.` : "."}`),
    onError: error => setMessage(error.message),
  });
  const updateInventory = trpc.commerce.updateInventory.useMutation({
    onSuccess: () => { setMessage("Inventory updated and retrieval cache refreshed."); void utils.commerce.merchantCatalog.invalidate(); },
    onError: error => setMessage(error.message),
  });
  const growthInsights = trpc.commerce.growthInsights.useQuery();
  const applySuggestion = trpc.commerce.applyGrowthSuggestion.useMutation({
    onSuccess: data => { setMessage(`Applied: price updated to ₹${(data.newPriceInrPaise / 100).toFixed(0)}.`); void utils.commerce.growthInsights.invalidate(); void utils.commerce.merchantCatalog.invalidate(); },
    onError: error => setMessage(error.message),
  });
  const rowsToImport = useMemo(() => csvRows.length ? csvRows : [], [csvRows]);

  const addSingleProduct = () => {
    const row = draftToRow(draft);
    const error = validateRow(row);
    if (error) return setMessage(error);
    createProducts.mutate({ rows: [row] });
  };
  const parseCsv = (raw: string) => {
    const lines = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length < 2) return setCsvError("CSV needs a header row and at least one product row.");
    const headers = parseCsvLine(lines[0]).map(header => header.toLowerCase());
    const required = ["title", "priceinr", "inventory", "deliverycities", "deliveryetatext", "styletags", "occasiontags"];
    const missing = required.filter(header => !headers.includes(header));
    if (missing.length) return setCsvError(`Missing required column(s): ${missing.join(", ")}.`);
    const rows = lines.slice(1).map((line, index) => {
      const cells = parseCsvLine(line);
      const cell = (name: string) => cells[headers.indexOf(name)] ?? "";
      const row = draftToRow({ title: cell("title"), brand: cell("brand"), description: cell("description"), imageUrl: cell("imageurl"), priceInr: cell("priceinr"), inventory: cell("inventory"), deliveryCities: cell("deliverycities"), deliveryEtaText: cell("deliveryetatext"), styleTags: cell("styletags"), occasionTags: cell("occasiontags") });
      return { row, error: validateRow(row), index: index + 2 };
    });
    const invalid = rows.find(item => item.error);
    if (invalid) return setCsvError(`Row ${invalid.index}: ${invalid.error}`);
    setCsvError(null); setCsvRows(rows.map(item => item.row)); setMessage(`${rows.length} valid products are ready to import. Review the preview, then confirm.`);
  };
  const selectCsv = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 800_000 || !file.name.toLowerCase().endsWith(".csv")) return setCsvError("Upload a CSV file under 800 KB.");
    const reader = new FileReader();
    reader.onload = () => parseCsv(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  return <div className="min-h-screen bg-[#060914] text-slate-100"><div className="mx-auto max-w-6xl space-y-7 p-4 sm:p-8"><header className="flex flex-col gap-4 rounded-3xl border border-emerald-400/20 bg-gradient-to-r from-emerald-950/70 via-[#0b1b13]/80 to-[#070e1c]/90 p-6 text-white shadow-[0_22px_70px_rgba(5,20,12,.4)] backdrop-blur-xl sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-bold tracking-[.16em] text-emerald-300"><Sparkles size={14} /> NOVACART · MERCHANT COMMAND CONSOLE</div><h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Manage NovaCart catalog. Let AI sell it securely.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100/75">Products added here remain visibly marked as merchant-supplied facts, receive a real semantic vector for product discovery, and stay behind BazaarOS payment safeguards.</p></div><Link href="/"><Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white">Open customer experience</Button></Link></header>

    {message ? <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-950/40 p-4 text-sm text-emerald-200 backdrop-blur"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-400" size={18} /> <span>{message}</span></div> : null}
    {catalog.isError ? <div className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-950/40 p-4 text-sm text-amber-200 backdrop-blur"><CircleAlert className="mt-0.5 shrink-0 text-amber-400" size={18} />This workspace is protected. Please sign in with the merchant owner/admin account to manage the catalog.</div> : null}

    <section className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-[#0c1222]/90 p-5 shadow-xl backdrop-blur"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Catalog products</p><p className="mt-2 text-3xl font-semibold text-white">{catalog.isLoading ? <span className="inline-block h-8 w-12 animate-pulse rounded bg-white/20" /> : (catalog.data?.productCount ?? 26)}</p><p className="mt-1 text-xs text-slate-400">Source and merchant-supplied records</p></div><div className="rounded-2xl border border-white/10 bg-[#0c1222]/90 p-5 shadow-xl backdrop-blur"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Semantic search</p><p className="mt-2 flex items-center gap-2 text-lg font-semibold text-emerald-300"><Database size={18} className="text-emerald-400" /> BGE vectors active</p><p className="mt-1 text-xs text-slate-400">384D Hugging Face vectors, hard filters first</p></div><div className="rounded-2xl border border-white/10 bg-[#0c1222]/90 p-5 shadow-xl backdrop-blur"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment events</p><p className="mt-2 text-3xl font-semibold text-cyan-200">{paymentStatus.isLoading ? <span className="inline-block h-8 w-12 animate-pulse rounded bg-white/20" /> : (paymentStatus.data?.length ?? 0)}</p><p className="mt-1 text-xs text-slate-400">Polling every 8s · verified test webhooks</p></div></section>

    <section className="grid gap-6 lg:grid-cols-[1.12fr_.88fr]"><div className="rounded-3xl border border-white/10 bg-[#0c1222]/90 p-5 shadow-xl backdrop-blur sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-white">Add one product</h2><p className="mt-1 text-sm text-slate-400">Simple fields first. BazaarOS validates before it writes.</p></div><PackagePlus className="text-emerald-400" /></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Input className="border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500" placeholder="Product title *" value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /><Input className="border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500" placeholder="Brand" value={draft.brand} onChange={event => setDraft({ ...draft, brand: event.target.value })} /><Input className="border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500 sm:col-span-2" placeholder="Description" value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} /><Input className="border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500" placeholder="Price in INR *" inputMode="decimal" value={draft.priceInr} onChange={event => setDraft({ ...draft, priceInr: event.target.value })} /><Input className="border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500" placeholder="Inventory *" inputMode="numeric" value={draft.inventory} onChange={event => setDraft({ ...draft, inventory: event.target.value })} /><Input className="border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500" placeholder="Delivery cities: Delhi, Mumbai *" value={draft.deliveryCities} onChange={event => setDraft({ ...draft, deliveryCities: event.target.value })} /><Input className="border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500" placeholder="Delivery promise *" value={draft.deliveryEtaText} onChange={event => setDraft({ ...draft, deliveryEtaText: event.target.value })} /><Input className="border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500" placeholder="Style tags: minimal, leather *" value={draft.styleTags} onChange={event => setDraft({ ...draft, styleTags: event.target.value })} /><Input className="border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500" placeholder="Occasions: gift, work *" value={draft.occasionTags} onChange={event => setDraft({ ...draft, occasionTags: event.target.value })} /><Input className="border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500 sm:col-span-2" placeholder="Product image URL (optional)" value={draft.imageUrl} onChange={event => setDraft({ ...draft, imageUrl: event.target.value })} /></div><Button onClick={addSingleProduct} disabled={createProducts.isPending} className="mt-5 w-full bg-emerald-400 font-semibold text-slate-950 hover:bg-emerald-300">{createProducts.isPending ? "Adding & indexing…" : "Add product and create semantic vector"}</Button></div>

      <div className="rounded-3xl border border-white/10 bg-[#0c1222]/90 p-5 shadow-xl backdrop-blur sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-white">Bulk CSV import</h2><p className="mt-1 text-sm text-slate-400">Upload a compact catalog and preview it before import.</p></div><FileUp className="text-emerald-400" /></div><input ref={fileRef} className="hidden" type="file" accept=".csv,text/csv" onChange={selectCsv} /><Button onClick={() => fileRef.current?.click()} variant="outline" className="mt-5 w-full border-dashed border-white/20 bg-white/[0.03] text-slate-200 hover:bg-white/[0.07] hover:text-white"><Upload size={16} className="mr-2 text-emerald-400" /> Choose catalog CSV</Button><p className="mt-3 text-xs leading-5 text-slate-400">Required headers: <code className="text-cyan-200">title, priceInr, inventory, deliveryCities, deliveryEtaText, styleTags, occasionTags</code>. Optional: <code className="text-cyan-200">brand, description, imageUrl</code>. Separate multi-value tags with commas inside the cell.</p>{csvError ? <p className="mt-3 rounded-lg border border-rose-400/20 bg-rose-950/40 p-3 text-xs text-rose-300">{csvError}</p> : null}{rowsToImport.length ? <div className="mt-4"><p className="text-sm font-semibold text-white">Ready to import: {rowsToImport.length} products</p><div className="mt-2 max-h-28 space-y-1 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-slate-300">{rowsToImport.slice(0, 5).map(row => <p key={row.title}>• {row.title} — ₹{row.priceInr}</p>)}</div><Button onClick={() => createProducts.mutate({ rows: rowsToImport })} disabled={createProducts.isPending} className="mt-3 w-full bg-cyan-300 font-semibold text-slate-950 hover:bg-cyan-200">{createProducts.isPending ? "Importing & indexing…" : "Confirm secure import"}</Button></div> : null}</div></section>

    <section className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]"><div className="rounded-3xl border border-white/10 bg-[#0c1222]/90 p-5 shadow-xl backdrop-blur sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-white">Your catalog</h2><p className="mt-1 text-sm text-slate-400">Inventory is a merchant-managed Test Mode overlay. Source provenance remains immutable.</p></div><Button onClick={() => reindex.mutate()} disabled={reindex.isPending} variant="outline" className="border-white/15 bg-white/[0.03] text-slate-200 hover:bg-white/10 hover:text-white"><RefreshCw size={15} className={`mr-2 text-cyan-300 ${reindex.isPending ? "animate-spin" : ""}`} /> Reindex semantic search</Button></div><div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/20"><div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-white/[0.04] px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400"><span>Product</span><span>Inventory</span><span>Action</span></div>{catalog.data?.productPreview?.map((product: any) => <div key={product.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-white/5 px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-white">{product.title}</p><p className="mt-0.5 text-xs text-slate-400">{product.overlayLabel}</p></div><span className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-emerald-200">{product.testInventory}</span><Button size="sm" onClick={() => updateInventory.mutate({ productId: product.id, inventory: product.testInventory + 1 })} disabled={updateInventory.isPending} variant="outline" className="h-8 border-white/15 bg-white/[0.03] text-xs text-slate-200 hover:bg-white/10 hover:text-white">+1</Button></div>)}</div></div>
      <div className="rounded-3xl border border-white/10 bg-[#0c1222]/90 p-5 shadow-xl backdrop-blur sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-white">Verified payment updates</h2><p className="mt-1 text-sm text-slate-400">Only signed Razorpay callbacks can change these provider states.</p></div><WalletCards className="text-emerald-400" /></div><div className="mt-5 space-y-3">{paymentStatus.data?.length ? paymentStatus.data.map(payment => <div key={payment.orderId} className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-white">₹{(payment.amountInrPaise / 100).toFixed(0)}</p><StatusBadge status={payment.status} /></div><p className="mt-2 text-xs text-slate-400">{payment.lastEvent ? `${payment.lastEvent.eventType} · signature ${payment.lastEvent.signatureVerified ? "verified" : "not verified"}` : "Awaiting verified provider event"}</p></div>) : <div className="rounded-2xl border border-white/5 bg-black/20 p-4 text-sm text-slate-400">No checkout status yet. When Razorpay is pointed to the published BazaarOS webhook endpoint, verified Test Mode events will appear here.</div>}</div></div></section>
    <section className="rounded-3xl border border-white/10 bg-[#0c1222]/90 p-5 shadow-xl backdrop-blur sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-white">Growth insights</h2><p className="mt-1 text-sm text-slate-400">Rule-based, computed from your real recent agent runs — not a machine-learned model. Nothing changes until you approve it.</p></div><TrendingDown className="text-amber-400" /></div><div className="mt-5 space-y-3">{growthInsights.isLoading ? <div className="rounded-2xl border border-white/5 bg-black/20 p-4 text-sm text-slate-400">Analyzing recent runs…</div> : growthInsights.data?.length ? growthInsights.data.map(insight => <div key={insight.productId} className="rounded-2xl border border-amber-400/20 bg-amber-950/10 p-4"><p className="text-sm font-medium text-white">{insight.title}</p><p className="mt-1 text-xs text-slate-400">{insight.rule}</p><p className="mt-2 text-xs text-slate-300">Recommended {insight.impressions}× recently · reached a mandate {insight.mandateReachedCount}× ({insight.mandateRatePercent}%)</p><div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs text-slate-400">₹{(insight.currentPriceInrPaise / 100).toFixed(0)} → <span className="font-semibold text-emerald-300">₹{(insight.suggestedPriceInrPaise / 100).toFixed(0)}</span> (suggested)</p><Button size="sm" onClick={() => applySuggestion.mutate({ productId: insight.productId, newPriceInrPaise: insight.suggestedPriceInrPaise })} disabled={applySuggestion.isPending} className="h-8 bg-amber-400 text-xs font-semibold text-slate-950 hover:bg-amber-300">Approve suggestion</Button></div></div>) : <div className="rounded-2xl border border-white/5 bg-black/20 p-4 text-sm text-slate-400">No underperforming products flagged from recent runs. Run some commerce scenarios in the Studio, then check back here.</div>}</div></section>
  </div></div>;
}

export default function MerchantDashboard() { return <DashboardLayout><MerchantWorkspace /></DashboardLayout>; }
