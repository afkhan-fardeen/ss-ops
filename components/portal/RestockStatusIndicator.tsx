"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRestockStatus } from "@/hooks/useRestockStatus";

/**
 * Ambient "still running" signal for a stock-balance restock in flight — visible
 * from any shell page since RestockQueueProvider is mounted once at the shell layout.
 * Renders nothing when idle or when the provider isn't mounted (non-admins).
 */
export function RestockStatusIndicator() {
  const { running, activeCount } = useRestockStatus();

  if (!running) return null;

  return (
    <Link
      href="/stock-balance/balance"
      title="Restock in progress — click to view"
      className="focus-ring flex items-center gap-1.5 rounded-full border border-stock/30 bg-stock-bg px-2.5 py-1 text-stock transition hover:bg-stock-bg/70"
    >
      <Loader2 size={12} className="animate-spin-slow" strokeWidth={2.4} />
      <span className="hidden text-[11px] font-medium sm:inline">
        Restocking {activeCount} item{activeCount === 1 ? "" : "s"}…
      </span>
    </Link>
  );
}
