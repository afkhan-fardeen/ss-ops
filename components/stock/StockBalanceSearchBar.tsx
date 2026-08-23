"use client";

import { Loader2, Search } from "lucide-react";

export function StockBalanceSearchBar({
  value,
  onChange,
  loading,
  page,
  hasNextPage,
  onLoadMore,
  loadMoreLoading,
  mode,
  mismatchCount,
  sweepLoading,
  onFindMismatches,
  onExitSweep,
}: {
  value: string;
  onChange: (value: string) => void;
  loading: boolean;
  page: number;
  hasNextPage: boolean;
  onLoadMore: () => void;
  loadMoreLoading?: boolean;
  mode: "browse" | "sweep";
  mismatchCount: number;
  sweepLoading?: boolean;
  onFindMismatches: () => void;
  onExitSweep: () => void;
}) {
  const sweep = mode === "sweep";
  const disabled = sweepLoading || (loading && sweep);

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="Search product, SKU, or barcode…"
            className="min-h-11 w-full rounded-card border border-line bg-white py-2 pl-9 pr-10 text-[13px] text-ink placeholder:text-muted focus:border-stock focus:outline-none focus:ring-2 focus:ring-stock/20 disabled:opacity-60"
          />
          {loading && !sweep ? (
            <Loader2
              size={15}
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted"
            />
          ) : null}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onFindMismatches}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-card border border-line bg-white px-3 text-[12px] font-medium text-ink transition hover:bg-canvas disabled:opacity-60"
        >
          Find all mismatches
        </button>
      </div>
      {sweep ? (
        <p className="text-[12px] text-muted">
          Showing all mismatches ({mismatchCount} found)
          {" · "}
          <button
            type="button"
            disabled={disabled}
            onClick={onExitSweep}
            className="font-medium text-ink underline-offset-2 hover:underline disabled:opacity-60"
          >
            Back to search
          </button>
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted">
          <span>Showing page {page}</span>
          {hasNextPage ? (
            <button
              type="button"
              disabled={loadMoreLoading || loading}
              onClick={onLoadMore}
              className="inline-flex items-center gap-1.5 rounded-card border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-ink transition hover:bg-canvas disabled:opacity-60"
            >
              {loadMoreLoading ? <Loader2 size={13} className="animate-spin" /> : null}
              Load 10 more
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
