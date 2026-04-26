"use client";

import { Suspense } from "react";
import type { CodRow } from "@/lib/cod/build-rows";
import type { CodDateOption } from "./CodDatePicker";
import { CodListFloatingActions } from "./CodListFloatingActions";
import { CODTable } from "./CODTable";
import { UbexStatusLine } from "./UbexStatusLine";

export function CODListView({
  dateOptions,
  rows,
  ordersScannedInWindow,
  ubexTokenConfigured,
  ubexTotalShipments,
  ubexConflictsCount,
  ubexApiMessage,
  ubexError,
}: {
  dateOptions: CodDateOption[];
  rows: CodRow[];
  ordersScannedInWindow: number;
  ubexTokenConfigured: boolean;
  ubexTotalShipments?: number;
  ubexConflictsCount?: number;
  ubexApiMessage?: string;
  ubexError?: string;
}) {
  return (
    <div className="space-y-5 pb-24 sm:pb-20">
      <UbexStatusLine
        tokenConfigured={ubexTokenConfigured}
        codRows={rows}
        totalShipments={ubexTotalShipments}
        conflictsCount={ubexConflictsCount}
        apiMessage={ubexApiMessage}
        error={ubexError}
      />
      <CODTable rows={rows} ordersScannedInWindow={ordersScannedInWindow} />
      <Suspense fallback={null}>
        <CodListFloatingActions dateOptions={dateOptions} />
      </Suspense>
    </div>
  );
}
