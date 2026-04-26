"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Play,
  FlaskConical,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { CronRunLog } from "@/lib/supabase/cron-run-log";

// ─── helpers ─────────────────────────────────────────────────────────────────

function msToNextRun(): number {
  const now = new Date();
  const msSinceBoundary =
    (now.getMinutes() % 15) * 60 * 1000 +
    now.getSeconds() * 1000 +
    now.getMilliseconds();
  return 15 * 60 * 1000 - msSinceBoundary;
}

function fmtCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtDuration(startedAt: string, completedAt: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const sec = Math.round((end - start) / 1000);
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

function fmtAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ run }: { run: CronRunLog }) {
  if (run.status === "running") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-500 dark:text-brand-400">
        <Loader2 size={13} className="animate-spin" /> Running…
      </span>
    );
  }
  if (run.status === "success") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle size={13} /> Success
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500 dark:text-red-400">
      <XCircle size={13} /> Error
    </span>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function CronStatus() {
  const [runs, setRuns] = useState<CronRunLog[]>([]);
  const [countdown, setCountdown] = useState(msToNextRun());
  const [triggering, setTriggering] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const latest = runs[0] ?? null;
  const isRunning = latest?.status === "running";

  // ── fetch status from API ──────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/sync/status");
      if (!res.ok) return;
      const json = await res.json();
      if (json.runs) setRuns(json.runs as CronRunLog[]);
    } catch {
      // silently ignore network errors
    }
  }, []);

  // ── polling — fast when running, slow otherwise ────────────────────────────
  useEffect(() => {
    fetchStatus();

    function schedule() {
      const interval = isRunning ? 3_000 : 30_000;
      pollRef.current = setTimeout(async () => {
        await fetchStatus();
        schedule();
      }, interval);
    }
    schedule();

    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  // ── countdown ticker ──────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setCountdown(msToNextRun()), 1_000);
    return () => clearInterval(id);
  }, []);

  // ── trigger handler ───────────────────────────────────────────────────────
  async function trigger(dryRun: boolean) {
    setTriggering(true);
    const label = dryRun ? "dry-run" : "live run";
    const toastId = toast.loading(`Triggering ${label}…`);

    try {
      const res = await fetch(`/api/sync/trigger?dry_run=${dryRun}`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        toast.error(`${label} failed: ${data.error ?? "unknown error"}`, { id: toastId });
      } else {
        toast.success(
          `${label} complete — checked ${data.checked}, fulfilled ${data.fulfilled}, skipped ${data.skipped}`,
          { id: toastId, duration: 6_000 },
        );
      }

      await fetchStatus();
    } catch (e) {
      toast.error(`Trigger error: ${e instanceof Error ? e.message : "unknown"}`, { id: toastId });
    } finally {
      setTriggering(false);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-card border border-border/60 bg-surface p-5 space-y-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw size={16} className="text-muted" />
          <h3 className="text-sm font-semibold text-foreground">Seissense Ops Bot</h3>
          {latest?.dry_run && (
            <span className="text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
              dry-run
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <Clock size={12} />
          <span>Next in</span>
          <span className="font-mono font-semibold text-foreground tabular-nums">
            {fmtCountdown(countdown)}
          </span>
        </div>
      </div>

      {/* last run summary */}
      {latest ? (
        <div className="rounded-lg bg-background/60 border border-border/40 px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <StatusBadge run={latest} />
            <span className="text-[11px] text-muted">
              {fmtAgo(latest.started_at)}
              {" · "}
              {fmtDuration(latest.started_at, latest.completed_at)}
            </span>
          </div>

          {/* stat pills */}
          {latest.status !== "running" && (
            <div className="flex flex-wrap gap-2 text-[11px] font-medium">
              <span className="px-2 py-0.5 rounded-full bg-muted/30 text-foreground">
                {latest.checked ?? 0} checked
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                {latest.fulfilled ?? 0} fulfilled
              </span>
              <span className="px-2 py-0.5 rounded-full bg-muted/30 text-foreground">
                {latest.skipped ?? 0} skipped
              </span>
              {(latest.errors ?? 0) > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  {latest.errors} errors
                </span>
              )}
            </div>
          )}

          {latest.status === "error" && latest.error_detail && (
            <p className="text-[11px] text-red-500 truncate">{latest.error_detail}</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted italic">No runs recorded yet.</p>
      )}

      {/* action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => trigger(true)}
          disabled={triggering || isRunning}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-card
            border border-border/60 bg-background text-foreground
            hover:bg-muted/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {triggering ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <FlaskConical size={12} />
          )}
          Dry run
        </button>

        <button
          onClick={() => trigger(false)}
          disabled={triggering || isRunning}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-card
            bg-brand-500 text-white hover:bg-brand-600
            disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {triggering ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Play size={12} />
          )}
          Run now
        </button>

        {runs.length > 1 && (
          <button
            onClick={() => setShowHistory((h) => !h)}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors ml-auto"
          >
            {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            History
          </button>
        )}
      </div>

      {/* run history list */}
      {showHistory && runs.length > 1 && (
        <div className="space-y-1 pt-1 border-t border-border/40">
          {runs.slice(1).map((run) => (
            <div
              key={run.id}
              className="flex items-center justify-between text-[11px] py-1"
            >
              <div className="flex items-center gap-2">
                <StatusBadge run={run} />
                {run.dry_run && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">(dry)</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-muted">
                <span>
                  {run.fulfilled ?? 0} fulfilled / {run.checked ?? 0} checked
                </span>
                <span>{fmtAgo(run.started_at)}</span>
                <span className="font-mono">{fmtDuration(run.started_at, run.completed_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
