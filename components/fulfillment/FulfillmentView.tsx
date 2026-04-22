"use client";

import { useMemo, useReducer, useState } from "react";
import type { OrderRow } from "@/lib/orders/build-order-rows";
import { UbexStatusLine } from "@/components/cod-list/UbexStatusLine";
import type { InitialLogEntry, RowState, RowStateMap, RowStatus } from "@/components/cod-list/CODListView";
import { pushOrderFulfillmentAction } from "@/app/(portal)/cod-list/actions";
import { FulfillmentTable } from "./FulfillmentTable";
import { FulfillmentFooter } from "./FulfillmentFooter";

type Action =
  | { type: "busy"; orderName: string }
  | { type: "fulfilled"; orderName: string; fulfillmentId: number }
  | { type: "error"; orderName: string; message: string };

function deriveInitial(rows: OrderRow[], logs?: InitialLogEntry[]): RowStateMap {
  const logByOrder = new Map<string, InitialLogEntry>();
  for (const l of logs ?? []) logByOrder.set(l.orderName, l);
  const m: RowStateMap = {};
  for (const r of rows) {
    if (r.alreadyFulfilled) {
      const log = logByOrder.get(r.orderName);
      m[r.orderName] = {
        status: "fulfilled",
        message: log?.message ?? "Already fulfilled in Shopify",
        fulfillmentId: log?.fulfillmentId,
      };
      continue;
    }
    const log = logByOrder.get(r.orderName);
    if (log?.status === "error") {
      m[r.orderName] = { status: "error", message: log.message ?? "Last push failed" };
      continue;
    }
    if (r.ubexId) m[r.orderName] = { status: "matched" };
    else m[r.orderName] = { status: "pending" };
  }
  return m;
}

function reducer(state: RowStateMap, action: Action): RowStateMap {
  switch (action.type) {
    case "busy": {
      const prev = state[action.orderName];
      if (!prev) return state;
      return { ...state, [action.orderName]: { ...prev, busy: true, message: undefined } };
    }
    case "fulfilled":
      return {
        ...state,
        [action.orderName]: {
          status: "fulfilled",
          fulfillmentId: action.fulfillmentId,
          busy: false,
        },
      };
    case "error": {
      const prev = state[action.orderName];
      return {
        ...state,
        [action.orderName]: {
          status: "error",
          message: action.message,
          busy: false,
          fulfillmentId: prev?.fulfillmentId,
        },
      };
    }
    default:
      return state;
  }
}

type FilterKey = "all" | "cod" | "paid" | "unfulfilled" | "matched";

const FILTER_LABELS: { key: FilterKey; label: string }[] = [
  { key: "unfulfilled", label: "Unfulfilled" },
  { key: "matched", label: "Ready to push" },
  { key: "all", label: "All" },
  { key: "cod", label: "COD" },
  { key: "paid", label: "Paid" },
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
      return rows.filter((r) => !r.alreadyFulfilled);
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
  const initial = useMemo(() => deriveInitial(rows, initialLogs), [rows, initialLogs]);
  const [stateMap, dispatch] = useReducer(reducer, initial);
  const [filter, setFilter] = useState<FilterKey>("unfulfilled");

  const filteredRows = useMemo(() => applyFilter(rows, filter, stateMap), [rows, filter, stateMap]);

  async function pushOne(row: OrderRow): Promise<boolean> {
    if (!row.ubexId) return false;
    const current = stateMap[row.orderName];
    if (current?.status === "fulfilled") return true;
    dispatch({ type: "busy", orderName: row.orderName });
    const res = await pushOrderFulfillmentAction({
      orderId: row.orderId,
      orderName: row.orderName,
      trackingNumber: row.ubexId,
      trackingUrl: row.trackingUrl || undefined,
    });
    if (res.ok) {
      dispatch({ type: "fulfilled", orderName: row.orderName, fulfillmentId: res.fulfillmentId });
      return true;
    }
    dispatch({ type: "error", orderName: row.orderName, message: res.error });
    return false;
  }

  async function fulfilAll(): Promise<{ success: number; failed: number; total: number }> {
    const targets = filteredRows.filter(
      (r) => r.ubexId && !r.alreadyFulfilled && stateMap[r.orderName]?.status !== "fulfilled",
    );
    const concurrency = 3;
    let success = 0;
    let failed = 0;
    const queue = [...targets];
    async function worker() {
      while (queue.length > 0) {
        const row = queue.shift();
        if (!row) break;
        const ok = await pushOne(row);
        if (ok) success++;
        else failed++;
      }
    }
    const workers = Array.from({ length: Math.min(concurrency, targets.length) }, () => worker());
    await Promise.all(workers);
    return { success, failed, total: targets.length };
  }

  const matchedCount = filteredRows.filter(
    (r) => r.ubexId && !r.alreadyFulfilled && stateMap[r.orderName]?.status !== "fulfilled",
  ).length;

  const filterCounts: Record<FilterKey, number> = {
    all: rows.length,
    cod: rows.filter((r) => r.isCod).length,
    paid: rows.filter((r) => !r.isCod).length,
    unfulfilled: rows.filter((r) => !r.alreadyFulfilled).length,
    matched: rows.filter((r) => r.ubexId && stateMap[r.orderName]?.status !== "fulfilled").length,
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

      <FulfillmentTable rows={filteredRows} stateMap={stateMap} onPush={pushOne} />
      <FulfillmentFooter matchedCount={matchedCount} onFulfilAll={fulfilAll} />
    </div>
  );
}

export type { RowState, RowStatus };
