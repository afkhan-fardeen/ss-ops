"use client";

import { Loader2, Send } from "lucide-react";
import { useState } from "react";

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
      if (res.failed === 0) setMsg(`Fulfilled ${res.success} of ${res.total}`);
      else setMsg(`Fulfilled ${res.success}/${res.total} (${res.failed} failed)`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Fulfil all failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed right-0 z-20 border-t border-line bg-white px-4 py-3 bottom-[var(--mobile-nav-h)] md:bottom-0"
      style={{ left: "var(--sb-w, 0px)" }}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-[12px] text-muted">
          <span>
            {matchedCount > 0
              ? `${matchedCount} ready to push to Shopify`
              : "All matched orders have been pushed"}
          </span>
          {msg ? (
            <span className="rounded-full bg-canvas px-2.5 py-0.5 font-medium text-ink">{msg}</span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy || matchedCount === 0}
          className="focus-ring inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-card bg-primary px-4 text-[14px] font-medium text-white shadow-soft transition hover:bg-primary/90 disabled:opacity-60 sm:h-9 sm:w-auto sm:text-[12px]"
        >
          {busy ? <Loader2 size={14} className="animate-spin-slow" /> : <Send size={14} />}
          {busy ? "Pushing…" : `Fulfil All${matchedCount > 0 ? ` (${matchedCount})` : ""}`}
        </button>
      </div>
    </div>
  );
}
