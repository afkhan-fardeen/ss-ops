"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

export function SendSalesReportButton({ dayKey }: { dayKey: string }) {
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    try {
      const res = await fetch(`/api/sales-report/send?day=${dayKey}`, { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        email?: { sent?: boolean; recipients?: number; error?: string };
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error ?? data.email?.error ?? "Failed to send");
      if (!data.email?.sent) {
        toast.info("No recipients configured — add one below to receive this report.");
      } else {
        toast.success(`Sent to ${data.email.recipients} recipient${data.email.recipients === 1 ? "" : "s"}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void send()}
      disabled={sending}
      className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12px] font-medium text-ink transition hover:bg-canvas disabled:opacity-60"
    >
      {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
      {sending ? "Sending…" : "Send now"}
    </button>
  );
}
