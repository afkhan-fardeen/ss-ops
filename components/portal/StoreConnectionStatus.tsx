import { Suspense } from "react";
import { Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { pingBothStores, type StoreConnectionStatus } from "@/lib/shopify/ping-store";
import { STORE_LABELS } from "@/lib/stores/labels";
import { StoreSwitcherTabs } from "./StoreSwitcherTabs";

// ─── Individual store pill ───────────────────────────────────────────────────

function StorePill({ label, status }: { label: string; status: StoreConnectionStatus }) {
  if (!status.configured) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1 text-[11px] font-medium text-muted">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-line" />
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

async function StoreStatusPills({ namespace }: { namespace: string }) {
  const { store1, store2 } = await pingBothStores();

  // If Store 2 is not configured at all, hide it entirely (store-switcher also hidden).
  const showStore2 = store2.configured;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Suspense>
        <StoreSwitcherTabs namespace={namespace} />
      </Suspense>
      <div className="flex flex-wrap items-center gap-2">
        <StorePill label={STORE_LABELS[1]} status={store1} />
        {showStore2 && <StorePill label={STORE_LABELS[2]} status={store2} />}
      </div>
    </div>
  );
}

// ─── Skeleton for Suspense ───────────────────────────────────────────────────

function StoreStatusSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1 rounded-lg border border-line bg-canvas p-1">
        <div className="h-8 w-28 animate-pulse rounded-md bg-line" />
        <div className="h-8 w-28 animate-pulse rounded-md bg-line" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-6 w-32 animate-pulse rounded-full bg-line" />
        <div className="h-6 w-36 animate-pulse rounded-full bg-line" />
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
export function StoreConnectionStatus({ namespace = "default" }: { namespace?: string }) {
  return (
    <Suspense fallback={<StoreStatusSkeleton />}>
      <StoreStatusPills namespace={namespace} />
    </Suspense>
  );
}
