"use client";

import { Loader2, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function RegisterWebhooksButton({ disabled }: { disabled?: boolean }) {
  const [loading, setLoading] = useState(false);

  async function register() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/register-webhooks", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("Could not register webhooks", {
          description: typeof data?.error === "string" ? data.error : `HTTP ${res.status}`,
        });
        return;
      }
      const count = typeof data?.registered === "number" ? data.registered : undefined;
      toast.success("Webhooks registered", {
        description:
          count !== undefined ? `${count} subscription${count === 1 ? "" : "s"}.` : undefined,
      });
    } catch (e) {
      toast.error("Network error", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void register()}
      disabled={disabled || loading}
      className="focus-ring inline-flex h-10 items-center gap-2 rounded-card bg-[#111111] px-4 text-[13px] font-semibold text-white shadow-soft transition hover:bg-[#333333] disabled:opacity-60"
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} strokeWidth={2.2} />}
      <span>{loading ? "Registering…" : "Register webhooks"}</span>
    </button>
  );
}
