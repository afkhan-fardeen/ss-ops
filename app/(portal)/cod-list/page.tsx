import { Fragment, Suspense } from "react";
import Link from "next/link";
import { Archive } from "lucide-react";
import { CODListView } from "@/components/cod-list/CODListView";
import { CodDatePills, type CodDatePill } from "@/components/cod-list/CodDatePills";
import { StatTick } from "@/components/cod-list/StatTick";
import {
  getCollectionWindow,
  getLastNWindows,
  getWindowForDateKey,
  shortWindowLabel,
  type CollectionWindow,
} from "@/lib/datetime/collection-window";
import { fetchCodOrders } from "@/lib/shopify/fetch-cod-orders";
import { getRates } from "@/lib/fx/getRates";
import { getCurrencyForCountry } from "@/lib/currency";
import { buildCodRows } from "@/lib/cod/build-rows";
import { buildUbexLookup, shopifyLast4Set, type UbexLookup } from "@/lib/ubex/build-lookup";
import { getUbexToken } from "@/lib/ubex/client";
import { AlertTriangle } from "lucide-react";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { upsertOrderUbexLinks } from "@/lib/supabase/order-ubex-links";

export default function CodListPage({
  searchParams,
}: {
  searchParams?: { date?: string };
}) {
  const dateKey = searchParams?.date;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Suspense fallback={<CodListSkeleton />}>
        <CodListContent dateKey={dateKey} />
      </Suspense>
    </div>
  );
}

function CodListSkeleton() {
  return (
    <>
      <div className="rounded-card border border-[#EBEBEB] bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="h-2.5 w-20 animate-pulse rounded bg-[#EBEBEB]" />
            <div className="h-5 w-48 animate-pulse rounded bg-[#EBEBEB]" />
          </div>
          <div className="h-3 w-40 animate-pulse rounded bg-[#EBEBEB]" />
        </div>
      </div>
      <TableSkeleton rows={8} columns={9} />
    </>
  );
}

async function CodListContent({ dateKey }: { dateKey?: string }) {
  let error: string | null = null;
  let win: CollectionWindow;
  let ratesView: { rates: Record<string, number>; fetchedAt: string; stale: boolean; source: string } | null = null;
  let rows: ReturnType<typeof buildCodRows> = [];
  let ordersScannedInWindow = 0;
  const ubexTokenConfigured = Boolean(getUbexToken());
  let ubexLookup: UbexLookup | undefined;

  win = dateKey ? getWindowForDateKey(dateKey) : getCollectionWindow();

  try {
    const { codOrders, ordersScannedInWindow: scanned } = await fetchCodOrders({
      createdAtMinIso: win.createdAtMinIso,
      createdAtMaxIso: win.createdAtMaxIso,
      cacheStrategy: "live",
    });
    ordersScannedInWindow = scanned;

    const currencies = codOrders
      .map((o) => getCurrencyForCountry(o.shipping_address?.country_code).currency)
      .filter((c): c is string => Boolean(c));
    const needed = shopifyLast4Set(codOrders);

    const [ratesResult, ubexResult] = await Promise.all([
      getRates(currencies),
      buildUbexLookup({ needed }).catch((e) => {
        console.warn("[ubex] lookup failed:", e);
        return undefined as UbexLookup | undefined;
      }),
    ]);

    ratesView = { rates: ratesResult.rates, fetchedAt: ratesResult.fetchedAt, stale: ratesResult.stale, source: ratesResult.source };
    ubexLookup = ubexResult;
    rows = buildCodRows(codOrders, ratesResult.rates, ubexLookup);

    if (!dateKey) {
      const matches = rows
        .filter((r) => r.ubexId && !r.alreadyFulfilled)
        .map((r) => ({ shopifyOrderId: r.orderId, shopifyOrderName: r.orderName, ubexTracking: r.ubexId }));
      void upsertOrderUbexLinks(matches).catch(() => {});
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load COD list";
  }

  if (error) {
    return (
      <div className="rounded-card border border-[#C25151]/25 bg-[rgba(194,81,81,0.10)] p-6">
        <div className="flex items-center gap-2 text-[#C25151]">
          <AlertTriangle size={18} />
          <h2 className="text-base font-semibold">Could not load COD list</h2>
        </div>
        <p className="mt-2 text-[13px] text-[#111111]">{error}</p>
      </div>
    );
  }

  const todayW = getCollectionWindow();
  const activeKey = dateKey ?? todayW.dateKey;
  const five = getLastNWindows(5);
  const pillsOrdered: CodDatePill[] = [...five].reverse().map((w) => {
    const isTodayW = w.dateKey === todayW.dateKey;
    return {
      dateKey: w.dateKey,
      href: isTodayW ? "/cod-list" : `/cod-list?date=${w.dateKey}`,
      label: shortWindowLabel(w),
      isToday: w.isToday,
      isActive: w.dateKey === activeKey,
    };
  });

  return (
    <Fragment key={dateKey ?? "today"}>
      {/* Window header */}
      <section className="animate-fade-in rounded-card border border-[#EBEBEB] bg-white/95 p-5 shadow-soft backdrop-blur-[2px] transition-shadow duration-300 hover:shadow-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#999999]">
              Collection window
            </p>
            <div className="mt-1 flex items-center gap-2">
              {win.isToday ? (
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full bg-[#4CAF50] animate-pulse-dot"
                  title="Current window (live)"
                />
              ) : null}
              <h2 className="text-[18px] font-semibold text-[#111111]">{win.label}</h2>
            </div>
            <p className="mt-0.5 text-[12px] text-[#999999]">
              Yesterday 14:00 → Today 14:00 · Bahrain (UTC+3)
            </p>
            <div className="mt-3">
              <CodDatePills pills={pillsOrdered} />
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
            <p className="text-[12px] text-[#999999]">
              <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
                <StatTick value={ordersScannedInWindow} />
                <span>scanned ·</span>
                <StatTick value={rows.length} />
                <span>COD</span>
              </span>
            </p>
            <Link
              href="/cod-history"
              className="focus-ring inline-flex items-center gap-1.5 rounded-card border border-[#EBEBEB] bg-white px-3 py-1.5 text-[12px] font-medium text-[#555555] transition hover:bg-[#F7F7F7] hover:text-[#111111]"
            >
              <Archive size={13} strokeWidth={2} />
              Archive
            </Link>
          </div>
        </div>
      </section>

      <div className="animate-fade-in" style={{ animationDelay: "40ms" }}>
        <CODListView
          rows={rows}
          ordersScannedInWindow={ordersScannedInWindow}
          ratesView={ratesView}
          ubexTokenConfigured={ubexTokenConfigured}
          ubexTotalShipments={ubexLookup?.totalShipments}
          ubexConflictsCount={ubexLookup?.last4Conflicts.size}
          ubexApiMessage={ubexLookup?.apiMessage}
          ubexError={ubexLookup?.error}
        />
      </div>
    </Fragment>
  );
}
