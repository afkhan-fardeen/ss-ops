"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function RefreshHealthButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);

  function handleRefresh() {
    startTransition(() => {
      router.refresh();
      setLastRefreshed(new Date().toLocaleTimeString());
    });
  }

  return (
    <div className="flex items-center gap-2">
      {lastRefreshed && (
        <span className="text-[11px] text-muted">Refreshed {lastRefreshed}</span>
      )}
      <button
        onClick={handleRefresh}
        disabled={isPending}
        className="focus-ring inline-flex items-center gap-1.5 rounded-card border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
      >
        <RefreshCw size={12} className={isPending ? "animate-spin" : undefined} />
        Refresh
      </button>
    </div>
  );
}
