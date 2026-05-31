import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import { FulfillmentView } from "@/components/fulfillment/FulfillmentView";
import { fetchOrders } from "@/lib/orders/fetch-orders";
import { buildOrderRows } from "@/lib/orders/build-order-rows";
import { buildUbexLookup, type UbexLookup } from "@/lib/ubex/build-lookup";
import { getUbexToken } from "@/lib/ubex/client";
import { getFulfillmentWindow } from "@/lib/datetime/fulfillment-window";
import { getLastLogsForOrders } from "@/lib/fulfillment/log";
import type { InitialLogEntry } from "@/hooks/useRowPushQueue";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { upsertOrderUbexLinks } from "@/lib/supabase/order-ubex-links";
import { applyUbexRowFallbacks } from "@/lib/ubex/apply-row-fallbacks";

/** Shell renders instantly — Suspense streams the data in when ready. */
export default function FulfillmentPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Suspense fallback={<FulfillmentSkeleton />}>
        <FulfillmentContent />
      </Suspense>
    </div>
  );
}

function FulfillmentSkeleton() {
  return (
    <>
      <div className="rounded-card border border-[#EBEBEB] bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="h-2.5 w-32 animate-pulse rounded bg-[#EBEBEB]" />
            <div className="h-4 w-48 animate-pulse rounded bg-[#EBEBEB]" />
          </div>
          <div className="h-3 w-40 animate-pulse rounded bg-[#EBEBEB]" />
        </div>
      </div>
      <TableSkeleton rows={8} columns={7} />
    </>
  );
}

async function FulfillmentContent() {
  let error: string | null = null;
  let windowLabel = "";
  let ordersScannedInWindow = 0;
  let rows: ReturnType<typeof buildOrderRows> = [];
  let ubexLookup: UbexLookup | undefined;
  let initialLogs: InitialLogEntry[] = [];
  const ubexTokenConfigured = Boolean(getUbexToken());

  try {
    const win = getFulfillmentWindow();
    windowLabel = `${win.label} · ${new Date(win.createdAtMinIso).toUTCString()} → ${new Date(win.createdAtMaxIso).toUTCString()}`;

    const [{ orders, ordersScannedInWindow: scanned }, ubexResult] = await Promise.all([
      fetchOrders({
        createdAtMinIso: win.createdAtMinIso,
        createdAtMaxIso: win.createdAtMaxIso,
        fulfillmentStatus: "any",
        cacheStrategy: "live",
      }),
      buildUbexLookup().catch((e) => {
        console.warn("[ubex] lookup failed:", e);
        return undefined as UbexLookup | undefined;
      }),
    ]);

    ordersScannedInWindow = scanned;
    ubexLookup = ubexResult;
    rows = buildOrderRows(orders, ubexLookup);

    rows = await applyUbexRowFallbacks(rows, orders.map((o) => o.id));

    // Save matched order→tracking links to Supabase for the auto-sync cron.
    const matches = rows
      .filter((r) => r.ubexId && !r.alreadyFulfilled)
      .map((r) => ({ shopifyOrderId: r.orderId, shopifyOrderName: r.orderName, ubexTracking: r.ubexId }));
    void upsertOrderUbexLinks(matches).catch(() => {});

    const logs = await getLastLogsForOrders(orders.map((o) => o.id)).catch(() => new Map());
    initialLogs = rows
      .map((r): InitialLogEntry | null => {
        const log = logs.get(r.orderId);
        if (!log) return null;
        return {
          orderName: r.orderName,
          status: log.status === "success" ? "success" : "error",
          message: log.error ?? undefined,
          fulfillmentId: log.shopify_fulfillment_id ?? undefined,
        };
      })
      .filter((x): x is InitialLogEntry => Boolean(x));
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load fulfillment queue";
  }

  if (error) {
    return (
      <div className="rounded-card border border-[#C25151]/25 bg-[rgba(194,81,81,0.10)] p-6">
        <div className="flex items-center gap-2 text-[#C25151]">
          <AlertTriangle size={18} />
          <h2 className="text-base font-semibold">Could not load fulfillment queue</h2>
        </div>
        <p className="mt-2 text-[13px] text-[#111111]">{error}</p>
      </div>
    );
  }

  return (
    <>
      <section className="animate-fade-up rounded-card border border-[#EBEBEB] bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#999999]">
              Fulfillment window
            </h2>
            <p className="mt-1 text-[14px] font-medium text-[#111111]">{windowLabel}</p>
          </div>
          <p className="font-mono text-[11px] text-[#999999]">
            {ordersScannedInWindow} order{ordersScannedInWindow === 1 ? "" : "s"} in window
          </p>
        </div>
      </section>
      <FulfillmentView
        rows={rows}
        ubexTokenConfigured={ubexTokenConfigured}
        ubexTotalShipments={ubexLookup?.totalShipments}
        ubexConflictsCount={ubexLookup?.last4Conflicts.size}
        ubexApiMessage={ubexLookup?.apiMessage}
        ubexError={ubexLookup?.error}
        initialLogs={initialLogs}
      />
    </>
  );
}
