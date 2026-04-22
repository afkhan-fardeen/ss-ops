"use client";

import { useMemo, useReducer } from "react";
import type { CodRow } from "@/lib/cod/build-rows";
import { CODTable } from "./CODTable";
import { FooterBar } from "./FooterBar";
import { RatesStrip } from "./RatesStrip";
import { UbexStatusLine } from "./UbexStatusLine";
import { pushOrderFulfillmentAction } from "@/app/(portal)/cod-list/actions";

export type RowStatus = "pending" | "matched" | "fulfilled" | "error";

export type RowState = {
  status: RowStatus;
  message?: string;
  fulfillmentId?: number;
  busy?: boolean;
};

export type RowStateMap = Record<string, RowState>;

type Action =
  | { type: "busy"; orderName: string }
  | { type: "fulfilled"; orderName: string; fulfillmentId: number }
  | { type: "error"; orderName: string; message: string }
  | { type: "reset-error"; orderName: string };

export type InitialLogEntry = {
  orderName: string;
  status: "success" | "error";
  message?: string;
  fulfillmentId?: number;
};

function deriveInitial(rows: CodRow[], logs?: InitialLogEntry[]): RowStateMap {
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
    case "reset-error": {
      const prev = state[action.orderName];
      if (!prev || prev.status !== "error") return state;
      return {
        ...state,
        [action.orderName]: {
          status: prev.fulfillmentId ? "fulfilled" : "matched",
          busy: false,
        },
      };
    }
    default:
      return state;
  }
}

export function CODListView({
  rows,
  ordersScannedInWindow,
  ratesView,
  ubexTokenConfigured,
  ubexTotalShipments,
  ubexConflictsCount,
  ubexApiMessage,
  ubexError,
  initialLogs,
}: {
  rows: CodRow[];
  ordersScannedInWindow: number;
  ratesView: { rates: Record<string, number>; fetchedAt: string; stale: boolean; source: string } | null;
  ubexTokenConfigured: boolean;
  ubexTotalShipments?: number;
  ubexConflictsCount?: number;
  ubexApiMessage?: string;
  ubexError?: string;
  initialLogs?: InitialLogEntry[];
}) {
  const initial = useMemo(() => deriveInitial(rows, initialLogs), [rows, initialLogs]);
  const [stateMap, dispatch] = useReducer(reducer, initial);

  async function pushOne(row: CodRow): Promise<boolean> {
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
    const targets = rows.filter(
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

  const matchedCount = rows.filter(
    (r) => r.ubexId && !r.alreadyFulfilled && stateMap[r.orderName]?.status !== "fulfilled",
  ).length;

  return (
    <div className="space-y-5">
      {ratesView ? <RatesStrip {...ratesView} /> : null}
      <UbexStatusLine
        tokenConfigured={ubexTokenConfigured}
        codRows={rows}
        totalShipments={ubexTotalShipments}
        conflictsCount={ubexConflictsCount}
        apiMessage={ubexApiMessage}
        error={ubexError}
      />
      <CODTable
        rows={rows}
        ordersScannedInWindow={ordersScannedInWindow}
        stateMap={stateMap}
        onPush={pushOne}
      />
      <FooterBar matchedCount={matchedCount} onFulfilAll={fulfilAll} />
    </div>
  );
}
