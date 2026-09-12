import { Fragment, Suspense } from "react";
import { CODListView } from "@/components/cod-list/CODListView";
import { CodListCollectionPanel } from "@/components/cod-list/CodListCollectionPanel";
import type { CodDateOption } from "@/components/cod-list/CodDatePicker";
import { RatesStrip } from "@/components/cod-list/RatesStrip";
import { getLastNWindows, shortWindowLabel } from "@/lib/datetime/collection-window";
import { loadStore2CodListData } from "@/lib/store2/cod-list-data";
import {
  resolveCodListPageSearchParams,
  type CodListSearchParamsInput,
} from "@/lib/cod/cod-list-params";
import { getUbexToken } from "@/lib/ubex/client";
import { AlertTriangle } from "lucide-react";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

export default async function CodListPage({
  searchParams,
}: {
  searchParams?: CodListSearchParamsInput | Promise<CodListSearchParamsInput | undefined>;
}) {
  const resolvedParams = await resolveCodListPageSearchParams(searchParams);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Suspense fallback={<CodListSkeleton />}>
        <CodListContent searchParams={resolvedParams} />
      </Suspense>
    </div>
  );
}

function CodListSkeleton() {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3 lg:items-stretch">
        <div className="rounded-card border border-line bg-white p-5 shadow-soft lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <div className="h-2.5 w-20 animate-pulse rounded bg-line" />
              <div className="h-5 w-48 animate-pulse rounded bg-line" />
            </div>
            <div className="h-3 w-40 animate-pulse rounded bg-line" />
          </div>
        </div>
        <div className="hidden min-h-[100px] rounded-card border border-line bg-white p-5 shadow-soft lg:block">
          <div className="h-3 w-24 animate-pulse rounded bg-line" />
          <div className="mt-4 h-8 w-full max-w-sm animate-pulse rounded bg-line" />
        </div>
      </div>
      <TableSkeleton rows={8} columns={8} />
    </>
  );
}

function CodListErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-card border border-[#C25151]/25 bg-[rgba(194,81,81,0.10)] p-6">
      <div className="flex items-center gap-2 text-[#C25151]">
        <AlertTriangle size={18} />
        <h2 className="text-base font-medium">{title}</h2>
      </div>
      <p className="mt-2 text-[13px] text-ink">{message}</p>
    </div>
  );
}

async function CodListContent({ searchParams }: { searchParams?: { date?: string; dates?: string } }) {
  const data = await loadStore2CodListData(searchParams);
  if (!data.ok) {
    return (
      <CodListErrorCard
        title={data.error.includes("Invalid") || data.error.includes("Select at most") ? "Invalid date selection" : "Could not load COD list"}
        message={data.error}
      />
    );
  }

  const options: CodDateOption[] = getLastNWindows(14).map((w) => ({
    dateKey: w.dateKey,
    label: shortWindowLabel(w),
    isToday: w.isToday,
  }));

  const single = data.singleWindow;
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
      <div className="grid min-h-0 animate-fade-in auto-rows-[minmax(0,1fr)] gap-4 lg:grid-cols-3 lg:items-stretch">
        <div className="flex min-h-[12rem] min-w-0 flex-col lg:col-span-2 lg:min-h-0">
          <CodListCollectionPanel
            titleLine={titleLine}
            subLine={subLine}
            options={options}
            selectedDateKeys={data.dateKeys}
            ordersScannedInWindow={data.ordersScannedInWindow}
            singleIsToday={Boolean(single?.isToday)}
          />
        </div>
        <div className="flex min-h-[12rem] min-w-0 flex-col lg:min-h-0">
          <div className="min-h-0 flex-1">
            <RatesStrip {...data.ratesView} />
          </div>
        </div>
      </div>

      <div className="animate-fade-in" style={{ animationDelay: "40ms" }}>
        <CODListView
          rows={data.rows}
          ordersScannedInWindow={data.ordersScannedInWindow}
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
