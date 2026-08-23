"use client";

import { Loader2, PackagePlus } from "lucide-react";
import type { StockBalanceRow } from "@/lib/stock/build-balance-rows";
import { targetShopifyOnHandForStore } from "@/lib/stock/stock-balance-target";
import { StatusPill, type StatusTone } from "@/components/portal/StatusPill";
import type { RestockRowStatus } from "@/hooks/useRestockQueue";

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return String(n);
}

function pillFor(row: StockBalanceRow): { tone: StatusTone; label: string } {
  if (row.status === "ambiguous") return { tone: "red", label: "Ambiguous" };
  if (row.status === "unlinked") return { tone: "amber", label: "Unlinked" };
  if (row.status === "skipped") return { tone: "neutral", label: "Skipped" };
  if (row.mismatch) return { tone: "amber", label: "Needs sync" };
  return { tone: "green", label: "Synced" };
}

function StoreColumn({
  title,
  accentClass,
  side,
  notListed,
}: {
  title: string;
  accentClass: string;
  side: StockBalanceRow["storeA"] | null;
  notListed?: boolean;
}) {
  if (notListed || side === null) {
    return (
      <div className={`rounded-card border border-line ${accentClass} p-3`}>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{title}</p>
        <p className="mt-3 text-[12px] text-muted">
          {notListed ? "Not listed on Store B" : "Store B not configured"}
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-card border border-line ${accentClass} p-3`}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{title}</p>
      <dl className="mt-2 space-y-1 text-[12px]">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">On hand</dt>
          <dd className="font-mono tabular-nums text-ink">{fmt(side.onHand)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Available</dt>
          <dd className="font-mono tabular-nums text-ink">{fmt(side.available)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Committed</dt>
          <dd className="font-mono tabular-nums text-ink">{fmt(side.committed)}</dd>
        </div>
      </dl>
    </div>
  );
}

export function StockBalanceCard({
  row,
  store2Configured,
  expanded,
  selected,
  restockStatus,
  onToggleExpand,
  onToggleSelect,
  onSync,
}: {
  row: StockBalanceRow;
  store2Configured: boolean;
  expanded: boolean;
  selected: boolean;
  restockStatus: RestockRowStatus;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onSync: () => void;
}) {
  const pill = pillFor(row);
  const busy = restockStatus === "busy";
  const canSelect = row.restockable && row.status === "matched";

  const targetA =
    row.status === "matched"
      ? targetShopifyOnHandForStore(row.ubexStock, row.storeB?.committed ?? 0)
      : null;
  const targetB =
    row.status === "matched" && row.storeB
      ? targetShopifyOnHandForStore(row.ubexStock, row.storeA.committed ?? 0)
      : null;

  return (
    <div className="rounded-card border border-line bg-white shadow-soft transition hover:bg-canvas/40">
      <div className="flex items-start gap-3 px-4 py-3">
        {canSelect ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 h-4 w-4 shrink-0 accent-stock"
            aria-label={`Select ${row.productName}`}
          />
        ) : (
          <span className="mt-1 inline-block h-4 w-4 shrink-0" />
        )}
        <button
          type="button"
          onClick={onToggleExpand}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-ink">{row.productName}</p>
              <p className="mt-0.5 font-mono text-[11px] text-muted">
                SKU {row.sku || "—"} · {row.barcode || "no barcode"}
              </p>
            </div>
            <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
          </div>
        </button>
      </div>

      <div
        className={[
          "grid transition-[grid-template-rows] duration-200 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 border-t border-line px-4 py-3">
            <div className="rounded-card border border-line bg-violet-50/40 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-violet-900/70">
                Ubex
              </p>
              <p className="mt-1 font-mono text-[13px] tabular-nums text-ink">
                Stock: {row.ubexStock}
              </p>
              <p className="font-mono text-[11px] text-muted">ID {row.ubexId}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <StoreColumn
                title="Store A"
                accentClass="bg-stock-bg/40"
                side={row.storeA}
              />
              {store2Configured ? (
                <StoreColumn
                  title="Store B"
                  accentClass="bg-stock-b-bg/60"
                  side={row.storeB}
                  notListed={row.storeB === null && row.status === "matched"}
                />
              ) : (
                <StoreColumn
                  title="Store B"
                  accentClass="bg-canvas"
                  side={null}
                  notListed
                />
              )}
            </div>

            {row.sharedAvailable !== null ? (
              <div className="border-t border-line pt-2">
                <p className="text-[11px] text-muted">Shared available</p>
                <p className="font-mono text-[15px] font-medium tabular-nums text-ink">
                  {row.sharedAvailable}
                </p>
                <p className="text-[11px] text-muted">Both stores should show this available</p>
                {targetA !== null ? (
                  <p className="mt-1 font-mono text-[11px] text-muted">
                    Target on-hand A: {targetA}
                    {targetB !== null ? ` · B: ${targetB}` : ""}
                  </p>
                ) : null}
              </div>
            ) : null}

            {row.restockable ? (
              <button
                type="button"
                disabled={busy}
                onClick={onSync}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-card bg-stock px-4 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <PackagePlus size={15} />}
                Sync both stores
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
