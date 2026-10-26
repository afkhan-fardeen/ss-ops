"use client";

import { useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { toast } from "sonner";

type ProgressState = {
  phase: "fetching" | "matching";
  fetched: number;
  percent: number | null;
  etaMs: number | null;
};

type SseEvent =
  | {
      type: "progress";
      phase: "fetching" | "matching";
      fetched: number;
      elapsedMs: number;
      percent: number | null;
      etaMs: number | null;
    }
  | { type: "done"; filename: string; totalItems: number; base64: string }
  | { type: "error"; error: string };

function formatEta(ms: number | null): string {
  if (ms === null) return "estimating…";
  const s = Math.round(ms / 1000);
  if (s <= 3) return "almost done";
  if (s < 60) return `~${s}s left`;
  return `~${Math.round(s / 60)} min left`;
}

function triggerDownload(base64: string, filename: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function UbexInventoryExportButton() {
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function startExport() {
    setProgress({ phase: "fetching", fetched: 0, percent: null, etaMs: null });
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ubex-inventory/download/progress", {
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `Export failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const line = chunk.trim();
          if (!line.startsWith("data:")) continue;
          const event = JSON.parse(line.slice(5).trim()) as SseEvent;
          if (event.type === "progress") {
            setProgress({
              phase: event.phase,
              fetched: event.fetched,
              percent: event.percent,
              etaMs: event.etaMs,
            });
          } else if (event.type === "done") {
            triggerDownload(event.base64, event.filename);
            toast.success(`Exported ${event.totalItems} item${event.totalItems === 1 ? "" : "s"}`);
          } else {
            throw new Error(event.error);
          }
        }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        toast.error(e instanceof Error ? e.message : "Export failed");
      }
    } finally {
      setProgress(null);
      abortRef.current = null;
    }
  }

  if (progress) {
    const pct = progress.percent ?? 12;
    return (
      <div className="flex min-w-[240px] flex-col gap-1.5 rounded-lg border border-line bg-white px-3 py-2">
        <div className="flex items-center justify-between gap-2 text-fs12">
          <span className="font-medium text-ink">
            {progress.phase === "matching"
              ? "Matching with stores…"
              : `Exporting… ${progress.fetched} item${progress.fetched === 1 ? "" : "s"}`}
          </span>
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            aria-label="Cancel export"
            className="text-muted transition hover:text-ink"
          >
            <X size={13} />
          </button>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas">
          <div
            className={`h-full bg-ink transition-all ${progress.percent === null ? "animate-pulse" : ""}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-fs11 text-muted">
          {progress.percent !== null ? `${progress.percent}% · ` : ""}
          {formatEta(progress.etaMs)}
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void startExport()}
      className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-fs12 font-medium text-white shadow-soft transition hover:bg-ink/90"
    >
      <Download size={13} />
      Export full inventory (.xlsx)
    </button>
  );
}
