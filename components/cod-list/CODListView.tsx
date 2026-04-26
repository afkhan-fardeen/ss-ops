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
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <Suspense fallback={null}>
          <CodListFloatingActions dateOptions={dateOptions} />
        </Suspense>
        <div className="min-w-0 flex-1">
          <UbexStatusLine
            tokenConfigured={ubexTokenConfigured}
            codRows={rows}
            totalShipments={ubexTotalShipments}
            conflictsCount={ubexConflictsCount}
            apiMessage={ubexApiMessage}
            error={ubexError}
          />
        </div>
      </div>
      <CODTable rows={rows} ordersScannedInWindow={ordersScannedInWindow} />
    </div>
  );
}
