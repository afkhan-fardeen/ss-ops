"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, PackagePlus, RefreshCw, X } from "lucide-react";
import type { StockBalanceRow } from "@/lib/stock/build-balance-rows";
import type { StockBalanceMode } from "@/lib/stock/load-stock-balance-preview";
import {
  applyStockBalanceFilters,
  DEFAULT_STOCK_BALANCE_FILTERS,
  filtersAreActive,
  WEEKLY_RESTOCK_PRESET,
  type StockBalanceFilterState,
} from "@/lib/stock/stock-balance-filters";
import { targetShopifyOnHandForStore } from "@/lib/stock/stock-balance-target";
import { STORE_LABELS } from "@/lib/stores/labels";
import { StockBalanceDetail, StockBalanceTile } from "@/components/stock/StockBalanceCard";
import { StockBalanceSearchBar } from "@/components/stock/StockBalanceSearchBar";
import { useRestockQueue, type RestockRowInput } from "@/hooks/useRestockQueue";

type Props = {
  rows: StockBalanceRow[];
  locationName: string;
  locationId: number;
  locationBName?: string | null;
  store2Configured: boolean;
  fetchedAt: string;
  itemCount: number;
  page: number;
  hasNextPage: boolean;
  search: string;
  mode: StockBalanceMode;
  summary: {
    matched: number;
    unlinked: number;
    ambiguous: number;
    skipped: number;
    mismatched: number;
  };
  refreshLoading?: boolean;
  loadMoreLoading?: boolean;
  sweepLoading?: boolean;
  onSearchChange: (value: string) => void;
  onLoadMore: () => void;
  onFindMismatches: () => void;
  onExitSweep: () => void;
  onRefresh?: () => void;
  /** Browse-only: reload current page after a successful sync. Sweep is a no-op. */
  onAfterSync?: () => void;
};

const FILTER_CHIPS: Array<{ key: keyof StockBalanceFilterState; label: string }> = [
  { key: "quantityMismatchOnly", label: "Quantity mismatch" },
  { key: "noCommittedOnly", label: "No committed" },
  { key: "hideUnlinked", label: "Hide unlinked" },
  { key: "hideAmbiguous", label: "Hide ambiguous" },
];

function toRestockInput(row: StockBalanceRow): RestockRowInput {
  return {
    ubexId: row.ubexId,
    barcode: row.barcode,
    productName: row.productName,
    ubexStock: row.ubexStock,
    shopifyOnHand: row.shopifyOnHand,
    shopifyAvailable: row.shopifyAvailable,
    shopifyCommitted: row.shopifyCommitted,
    storeA: row.storeA,
    storeB: row.storeB,
    sharedAvailable: row.sharedAvailable,
  };
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "focus-ring rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
        active
          ? "border-ink bg-ink text-white"
          : "border-line bg-white text-muted hover:bg-canvas",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

export function StockBalanceView({
  rows,
  locationName,
  locationBName,
  store2Configured,
  fetchedAt,
  itemCount,
  page,
  hasNextPage,
  search,
  mode,
  summary,
  refreshLoading,
  loadMoreLoading,
  sweepLoading,
  onSearchChange,
  onLoadMore,
  onFindMismatches,
  onExitSweep,
  onRefresh,
  onAfterSync,
}: Props) {
  const { state: restockState, restockOne, restockBulk, running } = useRestockQueue();
  const [filters, setFilters] = useState<StockBalanceFilterState>(
    mode === "sweep" ? WEEKLY_RESTOCK_PRESET : DEFAULT_STOCK_BALANCE_FILTERS,
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmRows, setConfirmRows] = useState<StockBalanceRow[] | null>(null);
  const [searchDraft, setSearchDraft] = useState(search);

  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  useEffect(() => {
    setFilters(mode === "sweep" ? WEEKLY_RESTOCK_PRESET : DEFAULT_STOCK_BALANCE_FILTERS);
    setSelected(new Set());
  }, [mode]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchDraft === search) return;
      if (mode === "sweep" && searchDraft === "") return;
      onSearchChange(searchDraft);
    }, 300);
    return () => clearTimeout(t);
  }, [searchDraft, search, onSearchChange, mode]);

  const filtered = useMemo(
    () => applyStockBalanceFilters(rows, filters),
    [rows, filters],
  );

  const restockable = useMemo(
    () => filtered.filter((r) => r.restockable),
    [filtered],
  );

  function toggleFilter(key: keyof StockBalanceFilterState) {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleExpand(id: string) {
    setActiveId((cur) => (cur === id ? null : id));
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllMatching() {
    setSelected(new Set(restockable.map((r) => r.ubexId)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const selectedRows = useMemo(
    () => filtered.filter((r) => selected.has(r.ubexId) && r.restockable),
    [filtered, selected],
  );

  async function runConfirm() {
    if (!confirmRows?.length) return;
    const inputs = confirmRows.map(toRestockInput);
    setConfirmRows(null);
    if (inputs.length === 1) await restockOne(inputs[0]!);
    else await restockBulk(inputs);
    clearSelection();
    onAfterSync?.();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-line border-l-4 border-l-stock bg-white p-4 shadow-soft">
        <p className="text-[12px] text-muted">
          Shared Ubex pool · {STORE_LABELS[1]} ({locationName})
          {store2Configured
            ? ` · ${STORE_LABELS[2]} (${locationBName ?? "auto"})`
            : ` · ${STORE_LABELS[2]} not configured`}
        </p>
        <p className="mt-1 text-[13px] text-ink">
          {itemCount} loaded · {summary.mismatched} need sync · fetched{" "}
          {new Date(fetchedAt).toLocaleString()}
        </p>
      </div>

      <StockBalanceSearchBar
        value={searchDraft}
        onChange={setSearchDraft}
        loading={Boolean(refreshLoading) && !loadMoreLoading}
        page={page}
        hasNextPage={hasNextPage}
        onLoadMore={onLoadMore}
        loadMoreLoading={loadMoreLoading}
        mode={mode}
        mismatchCount={rows.length}
        sweepLoading={sweepLoading}
        onFindMismatches={onFindMismatches}
        onExitSweep={onExitSweep}
      />

      <div className="flex flex-wrap items-center gap-2">
        {FILTER_CHIPS.map((chip) => (
          <FilterChip
            key={chip.key}
            active={filters[chip.key]}
            label={chip.label}
            onClick={() => toggleFilter(chip.key)}
          />
        ))}
        <button
          type="button"
          onClick={() => setFilters(WEEKLY_RESTOCK_PRESET)}
          className="rounded-full border border-stock/30 bg-stock-bg px-2.5 py-1 text-[11px] font-medium text-stock transition hover:opacity-90"
        >
          Weekly restock preset
        </button>
        {filtersAreActive(filters) ? (
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_STOCK_BALANCE_FILTERS)}
            className="text-[11px] font-medium text-muted hover:text-ink"
          >
            Clear filters
          </button>
        ) : null}
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            disabled={refreshLoading || running}
            onClick={() => onRefresh?.()}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-card border border-line bg-white px-3 text-[12px] font-medium text-ink transition hover:bg-canvas disabled:opacity-60"
          >
            {refreshLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            {mode === "sweep" ? "Refresh mismatches" : "Refresh"}
          </button>
        </div>
      </div>

      {restockable.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-card border border-line bg-white px-3 py-2 shadow-soft">
          <button
            type="button"
            onClick={selectAllMatching}
            className="text-[12px] font-medium text-stock hover:underline"
          >
            Select all matching ({restockable.length})
          </button>
          {selected.size > 0 ? (
            <>
              <button
                type="button"
                onClick={clearSelection}
                className="text-[12px] font-medium text-muted hover:text-ink"
              >
                Clear selection
              </button>
              <button
                type="button"
                disabled={running}
                onClick={() => setConfirmRows(selectedRows)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-card bg-stock px-3 text-[12px] font-medium text-white transition hover:opacity-90 disabled:opacity-60"
              >
                <PackagePlus size={14} />
                Sync selected ({selectedRows.length})
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="rounded-card border border-line bg-white px-4 py-10 text-center text-[13px] text-muted shadow-soft">
          {mode === "sweep"
            ? "No mismatches in this filter set. Clear filters to see the full sweep."
            : "No products in this view. Try another search or clear filters."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((row) => (
            <StockBalanceTile
              key={row.ubexId}
              row={row}
              store2Configured={store2Configured}
              selected={activeId === row.ubexId}
              restockStatus={restockState[row.ubexId]?.status ?? "idle"}
              onSelect={() => toggleExpand(row.ubexId)}
            />
          ))}
        </div>
      )}
      {activeId
        ? (() => {
            const row = filtered.find((r) => r.ubexId === activeId);
            if (!row) return null;
            return (
              <StockBalanceDetail
                row={row}
                store2Configured={store2Configured}
                selected={selected.has(row.ubexId)}
                restockStatus={restockState[row.ubexId]?.status ?? "idle"}
                onToggleSelect={() => toggleSelect(row.ubexId)}
                onSync={() => setConfirmRows([row])}
              />
            );
          })()
        : null}

      {confirmRows ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-card border border-line bg-white p-5 shadow-pop">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[15px] font-medium text-ink">Confirm sync</h3>
                <p className="mt-1 text-[12px] text-muted">
                  Sets Shopify on-hand from Ubex using shared-pool math
                  {store2Configured ? " for both stores" : ""}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmRows(null)}
                className="rounded-card p-1.5 text-muted hover:bg-canvas hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>
            <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto text-[12px]">
              {confirmRows.map((r) => {
                const targetA = targetShopifyOnHandForStore(
                  r.ubexStock,
                  r.storeB?.committed ?? 0,
                );
                const targetB = r.storeB
                  ? targetShopifyOnHandForStore(r.ubexStock, r.storeA.committed ?? 0)
                  : null;
                return (
                  <li key={r.ubexId} className="rounded-card border border-line px-3 py-2">
                    <p className="font-medium text-ink">{r.productName}</p>
                    <p className="font-mono text-muted">
                      Ubex {r.ubexStock} · available to sell {r.sharedAvailable ?? "—"}
                    </p>
                    <p className="font-mono text-muted">
                      {STORE_LABELS[1]} on-hand {r.storeA.onHand ?? "—"} → {targetA}
                      {targetB !== null
                        ? ` · ${STORE_LABELS[2]} ${r.storeB?.onHand ?? "—"} → ${targetB}`
                        : store2Configured
                          ? ` · ${STORE_LABELS[2]} not listed`
                          : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmRows(null)}
                className="rounded-card border border-line px-4 py-2 text-[13px] font-medium text-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void runConfirm()}
                className="inline-flex items-center gap-1.5 rounded-card bg-stock px-4 py-2 text-[13px] font-medium text-white"
              >
                <PackagePlus size={15} />
                Sync {confirmRows.length}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
