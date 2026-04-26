import { Fragment, Suspense } from "react";
import { CODListView } from "@/components/cod-list/CODListView";
import { CodDatePicker, type CodDateOption } from "@/components/cod-list/CodDatePicker";
import { StatTick } from "@/components/cod-list/StatTick";
import { getCollectionWindow, getLastNWindows, shortWindowLabel } from "@/lib/datetime/collection-window";
import { loadCodListData } from "@/lib/cod/cod-list-data";
import { getUbexToken } from "@/lib/ubex/client";
import { AlertTriangle } from "lucide-react";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { upsertOrderUbexLinks } from "@/lib/supabase/order-ubex-links";

export default function CodListPage({
  searchParams,
}: {
  searchParams?: { date?: string; dates?: string };
}) {
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Suspense fallback={<CodListSkeleton />}>
        <CodListContent searchParams={searchParams} />
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
      <TableSkeleton rows={8} columns={8} />
    </>
  );
}

async function CodListContent({ searchParams }: { searchParams?: { date?: string; dates?: string } }) {
  const data = await loadCodListData(searchParams);
  if (!data.ok) {
    return (
      <div className="rounded-card border border-[#C25151]/25 bg-[rgba(194,81,81,0.10)] p-6">
        <div className="flex items-center gap-2 text-[#C25151]">
          <AlertTriangle size={18} />
          <h2 className="text-base font-semibold">Invalid date selection</h2>
        </div>
        <p className="mt-2 text-[13px] text-[#111111]">{data.error}</p>
      </div>
    );
  }

  if (data.shouldUpsertUbexLinks) {
    const matches = data.rows
      .filter((r) => r.ubexId && !r.alreadyFulfilled)
      .map((r) => ({ shopifyOrderId: r.orderId, shopifyOrderName: r.orderName, ubexTracking: r.ubexId }));
    void upsertOrderUbexLinks(matches).catch(() => {});
  }

  const fourteen = getLastNWindows(14);
  const options: CodDateOption[] = [...fourteen]
    .reverse()
    .map((w) => ({
      dateKey: w.dateKey,
      label: shortWindowLabel(w),
      isToday: w.isToday,
    }));

  const single = data.singleWindow;
  const multi = data.dateKeys.length > 1;
  const titleLine = single ? single.label : `${data.dateKeys.length} days selected`;
  const subLine = single
    ? "Yesterday 14:00 → Today 14:00 · Bahrain (UTC+3)"
    : data.dateKeys
        .map((k) => {
          const w = data.windows.find((x) => x.dateKey === k);
          return w ? shortWindowLabel(w) : k;
        })
        .join(" · ");

  const ubexTokenConfigured = Boolean(getUbexToken());

  return (
    <Fragment key={data.dateKeys.join(",")}>
      <section className="animate-fade-in rounded-card border border-[#EBEBEB] bg-white/95 p-5 shadow-soft backdrop-blur-[2px] transition-shadow duration-300 hover:shadow-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#999999]">Collection</p>
            <div className="mt-1 flex items-center gap-2">
              {single?.isToday ? (
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full bg-[#4CAF50] animate-pulse-dot"
                  title="Includes current collection window (live)"
                />
              ) : null}
              <h2 className="text-[18px] font-semibold text-[#111111]">{titleLine}</h2>
            </div>
            <p className="mt-0.5 text-[12px] text-[#999999]">{subLine}</p>
            <div className="mt-3">
              <CodDatePicker options={options} selectedDateKeys={data.dateKeys} />
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
            <p className="text-[12px] text-[#999999]">
              <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
                <StatTick value={data.ordersScannedInWindow} />
                <span>COD in selection</span>
              </span>
            </p>
          </div>
        </div>
      </section>

      <div className="animate-fade-in" style={{ animationDelay: "40ms" }}>
        <CODListView
          rows={data.rows}
          ordersScannedInWindow={data.ordersScannedInWindow}
          ratesView={data.ratesView}
          ubexTokenConfigured={ubexTokenConfigured}
          ubexTotalShipments={data.ubexLookup?.totalShipments}
          ubexConflictsCount={data.ubexLookup?.last4Conflicts.size}
          ubexApiMessage={data.ubexLookup?.apiMessage}
          ubexError={data.ubexLookup?.error}
        />
      </div>
    </Fragment>
  );
}
