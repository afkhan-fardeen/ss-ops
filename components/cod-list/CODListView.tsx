"use client";

import type { CodRow } from "@/lib/cod/build-rows";
import { CODTable } from "./CODTable";
import { FooterBar } from "./FooterBar";
import { RatesStrip } from "./RatesStrip";
import { UbexStatusLine } from "./UbexStatusLine";
import { useRowPushQueue } from "@/hooks/useRowPushQueue";
import type {
  InitialLogEntry as _InitialLogEntry,
  RowState as _RowState,
  RowStateMap as _RowStateMap,
  RowStatus as _RowStatus,
} from "@/hooks/useRowPushQueue";

// Re-export types for backwards compatibility with existing imports.
export type RowStatus = _RowStatus;
export type RowState = _RowState;
export type RowStateMap = _RowStateMap;
export type InitialLogEntry = _InitialLogEntry;

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
  const { stateMap, pushOne, fulfilAll } = useRowPushQueue<CodRow>(rows, initialLogs);

  async function pushRow(row: CodRow): Promise<boolean> {
    const current = stateMap[row.orderName];
    if (current?.status === "fulfilled") return true;
    return pushOne(row);
  }

  async function handleFulfilAll() {
    const targets = rows.filter(
      (r) => r.ubexId && !r.alreadyFulfilled && stateMap[r.orderName]?.status !== "fulfilled",
    );
    return fulfilAll(targets);
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
        onPush={pushRow}
      />
      <FooterBar matchedCount={matchedCount} onFulfilAll={handleFulfilAll} />
    </div>
  );
}
