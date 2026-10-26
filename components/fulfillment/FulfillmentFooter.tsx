"use client";

import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type FulfilResult = { success: number; failed: number; total: number };

export function FulfillmentFooter({
  matchedCount,
  onFulfilAll,
}: {
  matchedCount: number;
  onFulfilAll: () => Promise<FulfilResult>;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    if (busy || matchedCount === 0) return;
    setBusy(true);
    setMsg(`Pushing ${matchedCount}…`);
    try {
      const res = await onFulfilAll();
      if (res.failed === 0) {
        setMsg(`Fulfilled ${res.success} of ${res.total}`);
        toast.success(`Fulfilled ${res.success} of ${res.total}`);
      } else {
        setMsg(`Fulfilled ${res.success}/${res.total} (${res.failed} failed)`);
        toast.error(`Fulfilled ${res.success}/${res.total} — ${res.failed} failed`);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Fulfil all failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed right-0 z-20 border-t border-line bg-white px-4 py-3 bottom-[var(--mobile-nav-h)] md:bottom-0 md:py-3"
      style={{ left: "var(--sb-w, 0px)" }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 text-body text-muted md:text-body-sm">
          <span className="truncate">
            {matchedCount > 0
              ? `${matchedCount} ready to push`
              : "All matched orders pushed"}
          </span>
          {msg ? (
            <span className="hidden rounded-full bg-canvas px-3 py-0.5 font-medium text-ink md:inline">{msg}</span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy || matchedCount === 0}
          className="focus-ring inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-6 text-body-lg font-medium text-white shadow-soft transition hover:bg-primary/90 active:bg-primary-strong disabled:opacity-60 md:h-9 md:rounded-card md:px-4 md:text-body-sm"
        >
          {busy ? <Loader2 size={14} className="animate-spin-slow" /> : <Send size={14} />}
          {busy ? "Pushing…" : `Fulfil All${matchedCount > 0 ? ` (${matchedCount})` : ""}`}
        </button>
      </div>
    </div>
  );
}
