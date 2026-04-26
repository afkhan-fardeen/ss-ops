"use client";

import type { CodRow } from "@/lib/cod/build-rows";
import { CODTable } from "./CODTable";
import { FooterBar } from "./FooterBar";
import { RatesStrip } from "./RatesStrip";
import { UbexStatusLine } from "./UbexStatusLine";

export function CODListView({
  rows,
  ordersScannedInWindow,
  ratesView,
  ubexTokenConfigured,
  ubexTotalShipments,
  ubexConflictsCount,
  ubexApiMessage,
  ubexError,
}: {
  rows: CodRow[];
  ordersScannedInWindow: number;
  ratesView: { rates: Record<string, number>; fetchedAt: string; stale: boolean; source: string } | null;
  ubexTokenConfigured: boolean;
  ubexTotalShipments?: number;
  ubexConflictsCount?: number;
  ubexApiMessage?: string;
  ubexError?: string;
}) {
  return (
    <div className="space-y-5 pb-40 sm:pb-36 md:pb-32">
      {ratesView ? <RatesStrip {...ratesView} /> : null}
      <UbexStatusLine
        tokenConfigured={ubexTokenConfigured}
        codRows={rows}
        totalShipments={ubexTotalShipments}
        conflictsCount={ubexConflictsCount}
        apiMessage={ubexApiMessage}
        error={ubexError}
      />
      <CODTable rows={rows} ordersScannedInWindow={ordersScannedInWindow} />
      <FooterBar />
    </div>
  );
}
