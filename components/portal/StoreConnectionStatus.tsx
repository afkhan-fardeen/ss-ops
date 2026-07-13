import { Suspense } from "react";
import { Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { pingBothStores, type StoreConnectionStatus } from "@/lib/shopify/ping-store";
import { StoreSwitcherTabs } from "./StoreSwitcherTabs";

// ─── Individual store pill ───────────────────────────────────────────────────

function StorePill({ label, status }: { label: string; status: StoreConnectionStatus }) {
  if (!status.configured) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#EBEBEB] bg-[#F7F7F7] px-3 py-1 text-[11px] font-medium text-[#999999]">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#CCCCCC]" />
        {label} — not configured
      </span>
    );
  }

  if (status.ok) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-[#4CAF50]/20 bg-[rgba(76,175,80,0.08)] px-3 py-1 text-[11px] font-medium text-[#2E7D32]"
        title={`${status.shopName ?? status.domain} · ${status.latencyMs}ms`}
      >
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4CAF50] opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#4CAF50]" />
        </span>
        {label}
        {status.shopName ? ` · ${status.shopName}` : ""}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-[#C25151]/20 bg-[rgba(194,81,81,0.08)] px-3 py-1 text-[11px] font-medium text-[#C25151]"
      title={status.error}
    >
      <AlertTriangle size={11} className="shrink-0" />
      {label} — error
    </span>
  );
}

// ─── Async data fetcher ──────────────────────────────────────────────────────

async function StoreStatusPills() {
  const { store1, store2 } = await pingBothStores();

  // If Store 2 is not configured at all, hide it entirely (store-switcher also hidden).
  const showStore2 = store2.configured;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Suspense>
        <StoreSwitcherTabs />
      </Suspense>
      <div className="flex flex-wrap items-center gap-2">
        <StorePill label="Store 1 (BH)" status={store1} />
        {showStore2 && <StorePill label="Store 2 (GCC)" status={store2} />}
      </div>
    </div>
  );
}

// ─── Skeleton for Suspense ───────────────────────────────────────────────────

function StoreStatusSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1 rounded-lg border border-[#EBEBEB] bg-[#F7F7F7] p-1">
        <div className="h-8 w-28 animate-pulse rounded-md bg-[#EBEBEB]" />
        <div className="h-8 w-28 animate-pulse rounded-md bg-[#EBEBEB]" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-6 w-32 animate-pulse rounded-full bg-[#EBEBEB]" />
        <div className="h-6 w-36 animate-pulse rounded-full bg-[#EBEBEB]" />
      </div>
    </div>
  );
}

// ─── Public export ───────────────────────────────────────────────────────────

/**
 * Renders the StoreSwitcherTabs alongside live Shopify connection status pills
 * for each configured store. Pings Shopify on every page load (no caching) so
 * the status is always current. Wrapped in Suspense so it never blocks render.
 */
export function StoreConnectionStatus() {
  return (
    <Suspense fallback={<StoreStatusSkeleton />}>
      <StoreStatusPills />
    </Suspense>
  );
}
