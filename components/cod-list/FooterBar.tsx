"use client";

import { Download, Loader2, Send, Mail } from "lucide-react";
import { useState, useTransition } from "react";

type FulfilResult = { success: number; failed: number; total: number };

export function FooterBar({
  matchedCount,
  onFulfilAll,
}: {
  matchedCount: number;
  onFulfilAll: () => Promise<FulfilResult>;
}) {
  const [pendingEmail, startEmailTransition] = useTransition();
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [fulfilBusy, setFulfilBusy] = useState(false);
  const [fulfilMsg, setFulfilMsg] = useState<string | null>(null);

  function sendEmail() {
    setEmailMsg(null);
    startEmailTransition(async () => {
      try {
        const resp = await fetch("/api/cod-list/email", { method: "POST" });
        const data = (await resp.json()) as { ok: boolean; error?: string };
        if (data.ok) setEmailMsg("Email sent");
        else setEmailMsg(data.error ?? "Send failed");
      } catch {
        setEmailMsg("Network error");
      }
    });
  }

  async function fulfilAll() {
    if (fulfilBusy || matchedCount === 0) return;
    setFulfilBusy(true);
    setFulfilMsg(`Pushing ${matchedCount}…`);
    try {
      const res = await onFulfilAll();
      if (res.failed === 0) setFulfilMsg(`Fulfilled ${res.success} of ${res.total}`);
      else setFulfilMsg(`Fulfilled ${res.success}/${res.total} (${res.failed} failed)`);
    } catch (e) {
      setFulfilMsg(e instanceof Error ? e.message : "Fulfil all failed");
    } finally {
      setFulfilBusy(false);
    }
  }

  const anyMsg = fulfilMsg ?? emailMsg;

  return (
    <div
      className="fixed bottom-0 right-0 z-20 border-t border-portal-border bg-portal-bg2/90 px-4 py-3 backdrop-blur"
      style={{ left: "var(--sb-w, 240px)" }}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-[12px] text-portal-text2">
          <span>
            {matchedCount > 0
              ? `${matchedCount} ready to push to Shopify`
              : "All matched orders have been pushed"}
          </span>
          {anyMsg ? (
            <span className="rounded-full bg-portal-bg3 px-2.5 py-0.5 font-medium text-portal-text">{anyMsg}</span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          <a
            href="/api/cod-list/download"
            className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-card border border-portal-border bg-portal-bg2 px-3 text-[12px] font-medium text-portal-text transition hover:bg-portal-bg3"
          >
            <Download size={14} strokeWidth={2} />
            Download Excel
          </a>
          <button
            type="button"
            onClick={sendEmail}
            disabled={pendingEmail}
            className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-card border border-portal-border bg-portal-bg2 px-3 text-[12px] font-medium text-portal-text transition hover:bg-portal-bg3 disabled:opacity-60"
          >
            {pendingEmail ? <Loader2 size={14} className="animate-spin-slow" /> : <Mail size={14} />}
            {pendingEmail ? "Sending…" : "Email Ubex"}
          </button>
          <button
            type="button"
            onClick={() => void fulfilAll()}
            disabled={fulfilBusy || matchedCount === 0}
            className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-card bg-portal-accent px-4 text-[12px] font-semibold text-portal-accentContrast shadow-soft transition hover:opacity-95 disabled:opacity-60"
          >
            {fulfilBusy ? <Loader2 size={14} className="animate-spin-slow" /> : <Send size={14} />}
            {fulfilBusy ? "Pushing…" : `Fulfil All${matchedCount > 0 ? ` (${matchedCount})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
