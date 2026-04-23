"use client";

import { useMemo, useState } from "react";
import type { OrderRow } from "@/lib/orders/build-order-rows";
import { UbexStatusLine } from "@/components/cod-list/UbexStatusLine";
import type { InitialLogEntry, RowState, RowStateMap, RowStatus } from "@/hooks/useRowPushQueue";
import { useRowPushQueue } from "@/hooks/useRowPushQueue";
import { FulfillmentTable } from "./FulfillmentTable";
import { FulfillmentFooter } from "./FulfillmentFooter";

type FilterKey = "all" | "cod" | "paid" | "unfulfilled" | "fulfilled" | "matched";

const FILTER_LABELS: { key: FilterKey; label: string }[] = [
  { key: "unfulfilled", label: "Unfulfilled" },
  { key: "fulfilled",   label: "Fulfilled" },
  { key: "matched",     label: "Ready to push" },
  { key: "all",         label: "All" },
  { key: "cod",         label: "COD" },
  { key: "paid",        label: "Paid" },
];

function applyFilter(rows: OrderRow[], filter: FilterKey, stateMap: RowStateMap): OrderRow[] {
  switch (filter) {
    case "all":
      return rows;
    case "cod":
      return rows.filter((r) => r.isCod);
    case "paid":
      return rows.filter((r) => !r.isCod);
    case "unfulfilled":
      return rows.filter((r) => stateMap[r.orderName]?.status !== "fulfilled");
    case "fulfilled":
      return rows.filter((r) => stateMap[r.orderName]?.status === "fulfilled");
    case "matched":
      return rows.filter((r) => r.ubexId && stateMap[r.orderName]?.status !== "fulfilled");
  }
}

export function FulfillmentView({
  rows,
  ubexTokenConfigured,
  ubexTotalShipments,
  ubexConflictsCount,
  ubexApiMessage,
  ubexError,
  initialLogs,
}: {
  rows: OrderRow[];
  ubexTokenConfigured: boolean;
  ubexTotalShipments?: number;
  ubexConflictsCount?: number;
  ubexApiMessage?: string;
  ubexError?: string;
  initialLogs?: InitialLogEntry[];
}) {
  const { stateMap, pushOne, fulfilAll } = useRowPushQueue<OrderRow>(rows, initialLogs);
  const [filter, setFilter] = useState<FilterKey>("unfulfilled");

  const filteredRows = useMemo(() => applyFilter(rows, filter, stateMap), [rows, filter, stateMap]);

  async function pushRow(row: OrderRow): Promise<boolean> {
    const current = stateMap[row.orderName];
    if (current?.status === "fulfilled") return true;
    return pushOne(row);
  }

  async function handleFulfilAll() {
    const targets = filteredRows.filter(
      (r) => r.ubexId && !r.alreadyFulfilled && stateMap[r.orderName]?.status !== "fulfilled",
    );
    return fulfilAll(targets);
  }

  const matchedCount = filteredRows.filter(
    (r) => r.ubexId && !r.alreadyFulfilled && stateMap[r.orderName]?.status !== "fulfilled",
  ).length;

  const filterCounts: Record<FilterKey, number> = {
    all:         rows.length,
    cod:         rows.filter((r) => r.isCod).length,
    paid:        rows.filter((r) => !r.isCod).length,
    unfulfilled: rows.filter((r) => stateMap[r.orderName]?.status !== "fulfilled").length,
    fulfilled:   rows.filter((r) => stateMap[r.orderName]?.status === "fulfilled").length,
    matched:     rows.filter((r) => r.ubexId && stateMap[r.orderName]?.status !== "fulfilled").length,
  };

  return (
    <div className="space-y-5">
      <UbexStatusLine
        tokenConfigured={ubexTokenConfigured}
        linked={rows.filter((r) => r.ubexId).length}
        total={rows.length}
        rowNoun="order"
        totalShipments={ubexTotalShipments}
        conflictsCount={ubexConflictsCount}
        apiMessage={ubexApiMessage}
        error={ubexError}
      />

      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Fulfillment filter">
        {FILTER_LABELS.map((f) => {
          const active = filter === f.key;
          const count = filterCounts[f.key];
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.key)}
              className={[
                "focus-ring inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition",
                active
                  ? "border-portal-accent bg-portal-accentSoft text-portal-accent"
                  : "border-portal-border bg-portal-bg2 text-portal-text2 hover:bg-portal-bg3",
              ].join(" ")}
            >
              <span>{f.label}</span>
              <span
                className={[
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  active ? "bg-portal-bg2 text-portal-accent" : "bg-portal-bg3 text-portal-text3",
                ].join(" ")}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <FulfillmentTable rows={filteredRows} stateMap={stateMap} onPush={pushRow} />
      <FulfillmentFooter matchedCount={matchedCount} onFulfilAll={handleFulfilAll} />
    </div>
  );
}

export type { RowState, RowStatus };
