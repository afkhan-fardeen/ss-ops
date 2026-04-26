"use client";

import { Suspense } from "react";
import type { CodRow } from "@/lib/cod/build-rows";
import { CODTable } from "./CODTable";
import { FooterBar } from "./FooterBar";
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
    <div className="space-y-5 pb-40 sm:pb-36 md:pb-32">
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
        <FooterBar />
      </Suspense>
    </div>
  );
}
