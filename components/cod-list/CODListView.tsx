"use client";

import type { CodRow } from "@/lib/cod/build-rows";
import { CODTable } from "./CODTable";
import { UbexStatusLine } from "./UbexStatusLine";

export function CODListView({
  rows,
  ordersScannedInWindow,
  ubexTokenConfigured,
  ubexTotalShipments,
  ubexConflictsCount,
  ubexApiMessage,
  ubexError,
}: {
  rows: CodRow[];
  ordersScannedInWindow: number;
  ubexTokenConfigured: boolean;
  ubexTotalShipments?: number;
  ubexConflictsCount?: number;
  ubexApiMessage?: string;
  ubexError?: string;
}) {
  return (
    <div className="space-y-5">
      <UbexStatusLine
        tokenConfigured={ubexTokenConfigured}
        codRows={rows}
        totalShipments={ubexTotalShipments}
        conflictsCount={ubexConflictsCount}
        apiMessage={ubexApiMessage}
        error={ubexError}
      />
      <CODTable rows={rows} ordersScannedInWindow={ordersScannedInWindow} />
    </div>
  );
}
