"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { btn } from "@/components/ui/button-styles";

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
        <span className="text-caption text-muted">Refreshed {lastRefreshed}</span>
      )}
      <button
        onClick={handleRefresh}
        disabled={isPending}
        className={btn("secondary", "md")}
      >
        <RefreshCw size={12} className={isPending ? "animate-spin" : undefined} />
        Refresh
      </button>
    </div>
  );
}
