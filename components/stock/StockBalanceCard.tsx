"use client";

import { Loader2, PackagePlus } from "lucide-react";
import type { StockBalanceRow } from "@/lib/stock/build-balance-rows";
import { targetShopifyOnHandForStore } from "@/lib/stock/stock-balance-target";
import { STORE_LABELS } from "@/lib/stores/labels";
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
  if (row.status === "store-b-not-listed") {
    return { tone: "neutral", label: `Not on ${STORE_LABELS[2]}` };
  }
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
          {notListed ? `Not listed on ${STORE_LABELS[2]}` : `${STORE_LABELS[2]} not configured`}
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

export function StockBalanceTile({
  row,
  store2Configured,
  selected,
  restockStatus,
  onSelect,
}: {
  row: StockBalanceRow;
  store2Configured: boolean;
  selected: boolean;
  restockStatus: RestockRowStatus;
  onSelect: () => void;
}) {
  const pill = pillFor(row);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        "flex min-h-[200px] flex-col justify-between rounded-card border bg-white p-4 text-left shadow-soft transition",
        selected ? "border-stock ring-2 ring-stock/20" : "border-line hover:bg-canvas/40",
        restockStatus === "busy" ? "opacity-70" : "",
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 font-medium text-ink">{row.productName}</p>
          <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
        </div>
        <p className="mt-0.5 font-mono text-[11px] text-muted">
          SKU {row.sku || "—"} · {row.barcode || "no barcode"}
        </p>
      </div>
      <dl className="mt-3 space-y-1 text-[12px]">
        <div className="flex justify-between gap-2">
          <dt className="text-muted">Ubex</dt>
          <dd className="font-mono tabular-nums text-ink">{row.ubexStock}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="truncate text-muted">{STORE_LABELS[1]}</dt>
          <dd className="shrink-0 font-mono tabular-nums text-ink">
            {fmt(row.storeA.committed)} committed
          </dd>
        </div>
        {store2Configured ? (
          <div className="flex justify-between gap-2">
            <dt className="truncate text-muted">{STORE_LABELS[2]}</dt>
            <dd className="shrink-0 font-mono tabular-nums text-ink">
              {fmt(row.storeB?.committed)} committed
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-2 border-t border-line pt-1">
          <dt className="text-ink">Available to sell</dt>
          <dd className="font-mono text-[15px] font-medium tabular-nums text-ink">
            {fmt(row.sharedAvailable)}
          </dd>
        </div>
      </dl>
    </button>
  );
}

export function StockBalanceDetail({
  row,
  store2Configured,
  selected,
  restockStatus,
  onToggleSelect,
  onSync,
}: {
  row: StockBalanceRow;
  store2Configured: boolean;
  selected: boolean;
  restockStatus: RestockRowStatus;
  onToggleSelect: () => void;
  onSync: () => void;
}) {
  const busy = restockStatus === "busy";
  const syncable = row.status === "matched" || row.status === "store-b-not-listed";
  const canSelect = row.restockable && syncable;
  const targetA = syncable
    ? targetShopifyOnHandForStore(row.ubexStock, row.storeB?.committed ?? 0)
    : null;
  const targetB =
    syncable && row.storeB
      ? targetShopifyOnHandForStore(row.ubexStock, row.storeA.committed ?? 0)
      : null;

  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-soft">
      <div className="flex items-start gap-3">
        {canSelect ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="mt-1 h-4 w-4 shrink-0 accent-stock"
            aria-label={`Select ${row.productName}`}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">{row.productName}</p>
          <p className="mt-0.5 font-mono text-[11px] text-muted">
            SKU {row.sku || "—"} · {row.barcode || "no barcode"}
          </p>
        </div>
        <StatusPill tone={pillFor(row).tone}>{pillFor(row).label}</StatusPill>
      </div>

      <div className="mt-3 space-y-3">
        <div className="rounded-card border border-line bg-violet-50/40 px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-violet-900/70">Ubex</p>
          <p className="mt-1 font-mono text-[13px] tabular-nums text-ink">Stock: {row.ubexStock}</p>
          <p className="font-mono text-[11px] text-muted">ID {row.ubexId}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <StoreColumn title={STORE_LABELS[1]} accentClass="bg-stock-bg/40" side={row.storeA} />
          {store2Configured ? (
            <StoreColumn
              title={STORE_LABELS[2]}
              accentClass="bg-stock-b-bg/60"
              side={row.storeB}
              notListed={
                row.storeB === null &&
                (row.status === "matched" || row.status === "store-b-not-listed")
              }
            />
          ) : (
            <StoreColumn title={STORE_LABELS[2]} accentClass="bg-canvas" side={null} notListed />
          )}
        </div>

        {row.sharedAvailable !== null ? (
          <div className="border-t border-line pt-2">
            <p className="text-[11px] text-muted">Available to sell</p>
            <p className="font-mono text-[15px] font-medium tabular-nums text-ink">
              {row.sharedAvailable}
            </p>
            <p className="text-[11px] text-muted">Both stores should show this available</p>
            {targetA !== null ? (
              <p className="mt-1 font-mono text-[11px] text-muted">
                Target on-hand {STORE_LABELS[1]}: {targetA}
                {targetB !== null ? ` · ${STORE_LABELS[2]}: ${targetB}` : ""}
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
  );
}
