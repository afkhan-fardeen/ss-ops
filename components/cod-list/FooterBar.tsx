"use client";

import { Download, Loader2, Mail } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export function FooterBar() {
  const [pendingEmail, startEmailTransition] = useTransition();
  const [emailMsg, setEmailMsg] = useState<string | null>(null);

  function sendEmail() {
    setEmailMsg(null);
    startEmailTransition(async () => {
      try {
        const resp = await fetch("/api/cod-list/email", { method: "POST" });
        const data = (await resp.json()) as { ok: boolean; error?: string };
        if (data.ok) {
          setEmailMsg("Email sent");
          toast.success("COD list emailed successfully");
        } else {
          const msg = data.error ?? "Send failed";
          setEmailMsg(msg);
          toast.error(msg);
        }
      } catch {
        setEmailMsg("Network error");
        toast.error("Network error sending email");
      }
    });
  }

  return (
    <div
      className="fixed bottom-0 right-0 z-20 border-t border-[#EBEBEB] bg-white/90 px-4 py-3 backdrop-blur"
      style={{ left: "var(--sb-w, 240px)" }}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-[12px] text-[#555555]">
          {emailMsg ? (
            <span className="rounded-full bg-[#F7F7F7] px-2.5 py-0.5 font-medium text-[#111111]">{emailMsg}</span>
          ) : (
            <span className="text-[#999999]">Download the Excel sheet or email it to Ubex.</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          <a
            href="/api/cod-list/download"
            className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-card border border-[#EBEBEB] bg-white px-3 text-[12px] font-medium text-[#111111] transition hover:bg-[#F7F7F7]"
          >
            <Download size={14} strokeWidth={2} />
            Download Excel
          </a>
          <button
            type="button"
            onClick={sendEmail}
            disabled={pendingEmail}
            className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-card border border-[#EBEBEB] bg-white px-3 text-[12px] font-medium text-[#111111] transition hover:bg-[#F7F7F7] disabled:opacity-60"
          >
            {pendingEmail ? <Loader2 size={14} className="animate-spin-slow" /> : <Mail size={14} />}
            {pendingEmail ? "Sending…" : "Email Ubex"}
          </button>
        </div>
      </div>
    </div>
  );
}
