"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeftRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PackagePlus,
  X,
} from "lucide-react";
import type { StockBalanceRow } from "@/lib/stock/build-balance-rows";
import {
  applyStockBalanceFilters,
  DEFAULT_STOCK_BALANCE_FILTERS,
  filtersAreActive,
  WEEKLY_RESTOCK_PRESET,
  type StockBalanceFilterState,
} from "@/lib/stock/stock-balance-filters";
import { targetShopifyOnHand } from "@/lib/stock/stock-balance-target";
import { StatusPill, type StatusTone } from "@/components/portal/StatusPill";
import { useRestockQueue, type RestockRowInput } from "@/hooks/useRestockQueue";

const PAGE_SIZE = 20;

const thNeutral = "px-3 py-2.5 font-semibold";
const thUbex = `${thNeutral} bg-violet-50/80 text-right text-violet-900/70`;
const thShopify = `${thNeutral} bg-emerald-50/80 text-right text-emerald-900/70`;
const tdUbex = "bg-violet-50/40 px-3 py-2.5 text-right tabular-nums text-violet-950/90";
const tdShopify = "bg-emerald-50/30 px-3 py-2.5 text-right tabular-nums text-emerald-950/90";

type Props = {
  rows: StockBalanceRow[];
  locationName: string;
  locationId: number;
  fetchedAt: string;
  itemCount: number;
  summary: {
    matched: number;
    unlinked: number;
    ambiguous: number;
    skipped: number;
    mismatched: number;
  };
  refreshLoading?: boolean;
  onRefresh?: () => void;
};

const statusLabel: Record<StockBalanceRow["status"], string> = {
  matched: "Matched",
  unlinked: "Unlinked",
  ambiguous: "Ambiguous",
  skipped: "Skipped",
};

const statusTone: Record<StockBalanceRow["status"], StatusTone> = {
  matched: "green",
  unlinked: "amber",
  ambiguous: "red",
  skipped: "neutral",
};

const FILTER_CHIPS: Array<{
  key: keyof StockBalanceFilterState;
  label: string;
}> = [
  { key: "quantityMismatchOnly", label: "Quantity mismatch" },
  { key: "noCommittedOnly", label: "No committed" },
  { key: "hideUnlinked", label: "Hide unlinked" },
  { key: "hideAmbiguous", label: "Hide ambiguous" },
];

function fmt(n: number | null): string {
  if (n === null) return "—";
  return String(n);
}

function fmtDelta(n: number | null): string {
  if (n === null) return "—";
  if (n === 0) return "0";
  return n > 0 ? `+${n}` : String(n);
}

function deltaClass(delta: number | null): string {
  if (delta === null || delta === 0) return "text-[#555555]";
  return delta > 0 ? "text-[#C25151]" : "text-[#4CAF50]";
}

function toRestockInput(row: StockBalanceRow): RestockRowInput {
  return {
    ubexId: row.ubexId,
    barcode: row.barcode,
    productName: row.productName,
    ubexStock: row.ubexStock,
    shopifyOnHand: row.shopifyOnHand,
    shopifyAvailable: row.shopifyAvailable,
    shopifyCommitted: row.shopifyCommitted,
  };
}

function shopifySubtitle(row: StockBalanceRow): string | null {
  const label = row.shopifyVariantLabel?.trim();
  if (!label || row.status !== "matched") return null;
  if (label.toLowerCase() === row.productName.trim().toLowerCase()) return null;
  return label;
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
          ? "border-[#111111] bg-[#111111] text-white"
          : "border-[#EBEBEB] bg-white text-[#555555] hover:bg-[#F7F7F7]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function ProductCell({ row }: { row: StockBalanceRow }) {
  const subtitle = shopifySubtitle(row);
  return (
    <td className="min-w-[220px] max-w-[360px] px-3 py-2.5 align-top">
      <p className="line-clamp-2 font-medium leading-snug text-[#111111]" title={row.productName}>
        {row.productName}
      </p>
      {subtitle ? (
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-emerald-800/70" title={subtitle}>
          Shopify: {subtitle}
        </p>
      ) : null}
    </td>
  );
}

function RestockIconButton({
  busy,
  done,
  err,
  onClick,
}: {
  busy: boolean;
  done: boolean;
  err: boolean;
  onClick: () => void;
}) {
  const label = busy
    ? "Restocking"
    : done
      ? "Restocked"
      : err
        ? "Retry restock"
        : "Restock so Shopify available matches Ubex";

  return (
    <button
      type="button"
      disabled={busy || done}
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-busy={busy || undefined}
      className={[
        "focus-ring inline-flex h-8 w-8 items-center justify-center rounded-card border transition",
        err
          ? "border-[#C25151]/30 bg-[rgba(194,81,81,0.10)] text-[#C25151]"
          : done
            ? "border-[#4CAF50]/30 text-[#4CAF50]"
            : "border-[#EBEBEB] bg-white text-[#111111] hover:bg-[#F7F7F7]",
        busy || done ? "cursor-not-allowed opacity-70" : "",
      ].join(" ")}
    >
      {busy ? (
        <Loader2 size={15} className="animate-spin-slow" />
      ) : done ? (
        <Check size={15} strokeWidth={2.4} />
      ) : err ? (
        <AlertCircle size={15} />
      ) : (
        <ArrowLeftRight size={15} strokeWidth={2.2} />
      )}
    </button>
  );
}

export function StockBalanceView({
  rows,
  locationName,
  locationId,
  fetchedAt,
  itemCount,
  summary,
  refreshLoading = false,
  onRefresh,
}: Props) {
  const router = useRouter();
  const { state, restockOne, restockBulk } = useRestockQueue();
  const [filters, setFilters] = useState<StockBalanceFilterState>(DEFAULT_STOCK_BALANCE_FILTERS);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [confirmRows, setConfirmRows] = useState<RestockRowInput[] | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const pageCheckboxRef = useRef<HTMLInputElement>(null);

  const rowById = useMemo(() => new Map(rows.map((r) => [r.ubexId, r])), [rows]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (rowById.has(id)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [rowById]);

  const filtered = useMemo(
    () => applyStockBalanceFilters(rows, filters),
    [rows, filters],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter(
      (r) =>
        r.productName.toLowerCase().includes(q) ||
        r.barcode.toLowerCase().includes(q) ||
        (r.shopifyVariantLabel?.toLowerCase().includes(q) ?? false),
    );
  }, [filtered, search]);

  useEffect(() => {
    setPage(1);
  }, [filters, search]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = visible.slice(pageStart, pageStart + PAGE_SIZE);
  const rangeEnd = visible.length === 0 ? 0 : Math.min(pageStart + PAGE_SIZE, visible.length);

  const restockableVisible = useMemo(
    () => visible.filter((r) => r.restockable),
    [visible],
  );

  const selectedRestockable = useMemo(() => {
    const out: StockBalanceRow[] = [];
    for (const id of selectedIds) {
      const row = rowById.get(id);
      if (row?.restockable) out.push(row);
    }
    return out;
  }, [selectedIds, rowById]);

  const pageRestockable = useMemo(
    () => pageRows.filter((r) => r.restockable),
    [pageRows],
  );

  const pageSelectedCount = useMemo(
    () => pageRestockable.filter((r) => selectedIds.has(r.ubexId)).length,
    [pageRestockable, selectedIds],
  );

  const pageAllSelected =
    pageRestockable.length > 0 && pageSelectedCount === pageRestockable.length;
  const pageSomeSelected = pageSelectedCount > 0 && !pageAllSelected;

  useEffect(() => {
    const el = pageCheckboxRef.current;
    if (el) el.indeterminate = pageSomeSelected;
  }, [pageSomeSelected]);

  const fetchedLabel = useMemo(() => {
    try {
      return new Date(fetchedAt).toLocaleString();
    } catch {
      return fetchedAt;
    }
  }, [fetchedAt]);

  const hasCommitted = confirmRows?.some((r) => (r.shopifyCommitted ?? 0) > 0) ?? false;
  const activeFilters = filtersAreActive(filters);

  function toggleFilter(key: keyof StockBalanceFilterState) {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function applyWeeklyPreset() {
    setFilters(WEEKLY_RESTOCK_PRESET);
    setSelectedIds(new Set());
  }

  function toggleRowSelected(ubexId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(ubexId)) next.delete(ubexId);
      else next.add(ubexId);
      return next;
    });
  }

  function togglePageSelection() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (pageAllSelected) {
        for (const row of pageRestockable) next.delete(row.ubexId);
      } else {
        for (const row of pageRestockable) next.add(row.ubexId);
      }
      return next;
    });
  }

  function selectAllMatching() {
    setSelectedIds(new Set(restockableVisible.map((r) => r.ubexId)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleConfirm() {
    if (!confirmRows?.length) return;
    setConfirmBusy(true);
    try {
      if (confirmRows.length === 1) {
        await restockOne(confirmRows[0]!);
      } else {
        await restockBulk(confirmRows);
      }
      setConfirmRows(null);
    } finally {
      setConfirmBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-[#EBEBEB] bg-[#F7F7F7] px-4 py-3 text-[13px] text-[#555555]">
        Δ compares Ubex sellable to Shopify <strong className="font-medium text-[#111111]">available</strong>.
        Restock sets Shopify <strong className="font-medium text-[#111111]">on hand</strong> so available
        matches Ubex (committed is preserved). Ubex is never modified.
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {FILTER_CHIPS.map(({ key, label }) => (
            <FilterChip
              key={key}
              label={label}
              active={filters[key]}
              onClick={() => toggleFilter(key)}
            />
          ))}
          <button
            type="button"
            onClick={applyWeeklyPreset}
            className="focus-ring rounded-full border border-[#EBEBEB] bg-white px-2.5 py-1 text-[11px] font-medium text-[#111111] transition hover:bg-[#F7F7F7]"
          >
            Weekly restock preset
          </button>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product or barcode…"
            className="w-48 rounded-card border border-[#EBEBEB] px-2.5 py-1.5 text-[12px] text-[#111111] placeholder:text-[#BBBBBB] focus:border-[#111111] focus:outline-none md:w-64"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {restockableVisible.length > 0 ? (
            <button
              type="button"
              onClick={selectAllMatching}
              className="focus-ring rounded-card border border-[#EBEBEB] bg-white px-3 py-1.5 text-[12px] font-medium text-[#111111] transition hover:bg-[#F7F7F7]"
            >
              Select all matching ({restockableVisible.length})
            </button>
          ) : null}
          {selectedIds.size > 0 ? (
            <button
              type="button"
              onClick={clearSelection}
              className="focus-ring rounded-card border border-[#EBEBEB] bg-white px-3 py-1.5 text-[12px] font-medium text-[#555555] transition hover:bg-[#F7F7F7]"
            >
              Clear selection
            </button>
          ) : null}
          {selectedRestockable.length > 0 ? (
            <button
              type="button"
              onClick={() => setConfirmRows(selectedRestockable.map(toRestockInput))}
              className="focus-ring inline-flex items-center gap-1.5 rounded-card border border-[#111111] bg-[#111111] px-3 py-1.5 text-[12px] font-medium text-white transition hover:opacity-90"
            >
              <PackagePlus size={14} />
              Restock selected ({selectedRestockable.length})
            </button>
          ) : null}
          <button
            type="button"
            disabled={refreshLoading}
            onClick={() => (onRefresh ? onRefresh() : router.refresh())}
            className="focus-ring rounded-card border border-[#EBEBEB] bg-white px-3 py-1.5 text-[12px] font-medium text-[#111111] transition hover:bg-[#F7F7F7] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshLoading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-card border border-[#EBEBEB] bg-white shadow-soft">
        <table className="w-full min-w-[1020px] border-collapse text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-[#EBEBEB] text-[11px] font-semibold uppercase tracking-wide">
              <th className={`${thNeutral} w-10 text-center`}>
                <input
                  ref={pageCheckboxRef}
                  type="checkbox"
                  checked={pageAllSelected}
                  disabled={pageRestockable.length === 0}
                  onChange={togglePageSelection}
                  aria-label="Select all restockable rows on this page"
                  className="h-4 w-4 rounded border-[#EBEBEB] disabled:opacity-40"
                />
              </th>
              <th className={thNeutral}>Product</th>
              <th className={thNeutral}>Barcode</th>
              <th className={thUbex}>Ubex</th>
              <th className={thShopify}>On hand</th>
              <th className={thShopify}>Available</th>
              <th className={thShopify}>Committed</th>
              <th className={`${thNeutral} text-right`}>Δ</th>
              <th className={thNeutral}>Status</th>
              <th className={`${thNeutral} text-center`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-[#999999]">
                  {activeFilters ? "No rows match the current filters." : "No rows to show."}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => {
                const rowState = state[row.ubexId];
                const busy = rowState?.status === "busy";
                const done = rowState?.status === "success";
                const err = rowState?.status === "error";
                const checked = selectedIds.has(row.ubexId);

                return (
                  <tr
                    key={row.ubexId}
                    className="border-b border-[#F0F0F0] last:border-0 hover:bg-[#FAFAFA]/80"
                  >
                    <td className="px-3 py-2.5 text-center">
                      {row.restockable ? (
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRowSelected(row.ubexId)}
                          aria-label={`Select ${row.productName}`}
                          className="h-4 w-4 rounded border-[#EBEBEB]"
                        />
                      ) : (
                        <span className="inline-block h-4 w-4" aria-hidden />
                      )}
                    </td>
                    <ProductCell row={row} />
                    <td className="px-3 py-2.5 font-mono text-[12px] text-[#555555]">
                      {row.barcode || "—"}
                    </td>
                    <td className={tdUbex}>{fmt(row.ubexStock)}</td>
                    <td className={tdShopify}>{fmt(row.shopifyOnHand)}</td>
                    <td className={tdShopify}>{fmt(row.shopifyAvailable)}</td>
                    <td className={tdShopify}>{fmt(row.shopifyCommitted)}</td>
                    <td
                      className={`px-3 py-2.5 text-right font-medium tabular-nums ${deltaClass(row.delta)}`}
                    >
                      {fmtDelta(row.delta)}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusPill tone={statusTone[row.status]}>{statusLabel[row.status]}</StatusPill>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {row.restockable ? (
                        <RestockIconButton
                          busy={busy}
                          done={done}
                          err={err}
                          onClick={() => setConfirmRows([toRestockInput(row)])}
                        />
                      ) : (
                        <span
                          className="text-[11px] text-[#BBBBBB]"
                          title={
                            row.status !== "matched"
                              ? "Only matched rows can be restocked"
                              : "Sellable stock already in sync"
                          }
                        >
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {visible.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] tabular-nums text-[#555555]">
            {visible.length <= PAGE_SIZE
              ? `Showing all ${visible.length} row${visible.length === 1 ? "" : "s"}`
              : `Showing ${pageStart + 1}–${rangeEnd} of ${visible.length}`}
            {totalPages > 1 ? ` · Page ${safePage} of ${totalPages}` : ""}
            {selectedIds.size > 0 ? ` · ${selectedRestockable.length} selected` : ""}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="focus-ring inline-flex items-center gap-1 rounded-card border border-[#EBEBEB] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#111111] transition hover:bg-[#F7F7F7] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              Previous
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="focus-ring inline-flex items-center gap-1 rounded-card border border-[#EBEBEB] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#111111] transition hover:bg-[#F7F7F7] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      ) : null}

      <p className="text-[12px] text-[#999999]">
        Location: {locationName} (id {locationId}) · {itemCount} Ubex items loaded
        {visible.length !== itemCount ? ` · ${visible.length} after filter` : ""}
        {visible.length > 0
          ? ` · Showing ${pageStart + 1}–${rangeEnd}${search.trim() ? ` matching “${search.trim()}”` : ""}`
          : search.trim()
            ? ` · 0 matching “${search.trim()}”`
            : ""}{" "}
        · Matched {summary.matched}, unlinked {summary.unlinked}, ambiguous {summary.ambiguous},
        mismatched {summary.mismatched} · Fetched {fetchedLabel}
      </p>

      {confirmRows ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-[1px]"
            aria-label="Close"
            onClick={() => !confirmBusy && setConfirmRows(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-md rounded-card border border-[#EBEBEB] bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.18)]"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <h2 className="text-base font-semibold text-[#111111]">Confirm restock</h2>
              <button
                type="button"
                disabled={confirmBusy}
                onClick={() => setConfirmRows(null)}
                className="focus-ring -m-1 rounded-md p-1 text-[#999999] transition hover:bg-[#F7F7F7] hover:text-[#111111]"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-[12px] text-[#555555]">
              Set Shopify available to Ubex sellable for {confirmRows.length} item
              {confirmRows.length === 1 ? "" : "s"} at {locationName} (on hand adjusted; committed
              preserved).
            </p>

            {hasCommitted ? (
              <p className="mt-2 rounded-lg border border-[#EBEBEB] bg-[#F7F7F7] px-3 py-2 text-[12px] text-[#555555]">
                Some rows have committed stock — on hand will increase by the committed amount so
                available matches Ubex.
              </p>
            ) : null}

            <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-[12px]">
              {confirmRows.map((r) => {
                const targetOnHand = targetShopifyOnHand(r.ubexStock, r.shopifyCommitted);
                return (
                  <li
                    key={r.ubexId}
                    className="rounded-lg border border-[#F0F0F0] bg-[#FAFAFA] px-3 py-2"
                  >
                    <p className="font-medium text-[#111111]">{r.productName}</p>
                    <p className="mt-0.5 text-[#555555]">
                      available {fmt(r.shopifyAvailable)} → {r.ubexStock}
                    </p>
                    <p className="mt-0.5 text-[#555555]">
                      on hand {fmt(r.shopifyOnHand)} → {targetOnHand}
                      {(r.shopifyCommitted ?? 0) > 0 ? ` · committed ${r.shopifyCommitted}` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={confirmBusy}
                onClick={() => setConfirmRows(null)}
                className="focus-ring rounded-lg border border-[#EBEBEB] bg-white px-3 py-1.5 text-[12px] font-medium text-[#555555] transition hover:bg-[#F7F7F7] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmBusy}
                onClick={() => void handleConfirm()}
                className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-[#111111] bg-[#111111] px-3 py-1.5 text-[12px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {confirmBusy ? <Loader2 size={13} className="animate-spin-slow" /> : null}
                Confirm restock
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
