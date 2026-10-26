"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { btn } from "@/components/ui/button-styles";

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
        toast.info("No recipients configured — add one in Sales Report settings.");
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
      className={btn("secondary", "sm")}
    >
      {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
      {sending ? "Sending…" : "Send now"}
    </button>
  );
}
