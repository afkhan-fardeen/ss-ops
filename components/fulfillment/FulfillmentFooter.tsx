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
      className="fixed bottom-0 right-0 z-20 border-t border-[#EBEBEB] bg-white/90 px-4 py-3 backdrop-blur"
      style={{ left: "var(--sb-w, 240px)" }}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-[12px] text-[#555555]">
          <span>
            {matchedCount > 0
              ? `${matchedCount} ready to push to Shopify`
              : "All matched orders have been pushed"}
          </span>
          {msg ? (
            <span className="rounded-full bg-[#F7F7F7] px-2.5 py-0.5 font-medium text-[#111111]">{msg}</span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy || matchedCount === 0}
          className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-card bg-[#111111] px-4 text-[12px] font-semibold text-white shadow-soft transition hover:bg-[#333333] disabled:opacity-60"
        >
          {busy ? <Loader2 size={14} className="animate-spin-slow" /> : <Send size={14} />}
          {busy ? "Pushing…" : `Fulfil All${matchedCount > 0 ? ` (${matchedCount})` : ""}`}
        </button>
      </div>
    </div>
  );
}
