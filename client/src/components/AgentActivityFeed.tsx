import { useState } from "react";
import { Activity, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

const channelLabel: Record<string, string> = {
  text: "Human · Text",
  voice: "Human · Voice",
  image: "Human · Image",
  a2a: "External AI Agent",
};

const channelTone: Record<string, string> = {
  text: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  voice: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  image: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  a2a: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

function timeAgo(iso: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

/**
 * Polls real, already-persisted agent runs — from this browser, an external
 * script, or a genuine third-party A2A agent — since every run writes its
 * full trace to the database regardless of caller. Not a simulation: if
 * nobody has run anything recently, this is empty.
 */
export function AgentActivityFeed() {
  const [expandedRun, setExpandedRun] = useState<number | null>(null);
  const activity = trpc.commerce.recentActivity.useQuery(
    { limit: 12 },
    { refetchInterval: 4_000 }
  );

  const runs = activity.data ?? [];

  return (
    <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-xl shadow-xs overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold text-foreground uppercase tracking-wide">Live Agent Activity</span>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          polling every 4s · any caller
        </span>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-border">
        {runs.length === 0 ? (
          <p className="px-4 py-6 text-xs text-muted-foreground text-center">
            No runs recorded yet. Trigger one above, or point an external agent at the API — it will appear here within seconds.
          </p>
        ) : (
          runs.map(run => (
            <div key={run.runId} className="px-4 py-2.5">
              <button
                onClick={() => setExpandedRun(expandedRun === run.runId ? null : run.runId)}
                className="w-full flex items-start gap-2 text-left"
              >
                {expandedRun === run.runId ? (
                  <ChevronDown size={13} className="mt-0.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight size={13} className="mt-0.5 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-[9px] font-mono px-1.5 py-0 ${channelTone[run.channel] ?? channelTone.text}`}>
                      {channelLabel[run.channel] ?? run.channel}
                    </Badge>
                    <span
                      className={`text-[9px] font-mono px-1.5 rounded ${
                        run.status === "blocked"
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {run.status}
                    </span>
                    <span className="text-[9px] text-muted-foreground">{timeAgo(String(run.startedAt))}</span>
                  </div>
                  <p className="mt-1 text-xs text-foreground truncate">{run.query}</p>
                </div>
              </button>

              {expandedRun === run.runId && (
                <div className="mt-2 ml-5 space-y-1.5 border-l border-border pl-3">
                  {run.steps.map((step, index) => (
                    <div key={index} className="text-[11px]">
                      <span className="font-mono font-bold text-foreground uppercase">{step.agentName}</span>
                      <span
                        className={`ml-1.5 ${
                          step.status === "blocked" || step.status === "error"
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {step.status}
                      </span>
                      <span className="text-muted-foreground"> · {step.latencyMs}ms</span>
                      <p className="text-muted-foreground leading-snug">{step.rationale}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
