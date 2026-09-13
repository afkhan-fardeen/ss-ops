"use client";

import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";

export function StockBalanceSearchBar({
  value,
  onChange,
  loading,
  page,
  hasNextPage,
  onPrevPage,
  onNextPage,
  mode,
}: {
  value: string;
  onChange: (value: string) => void;
  loading: boolean;
  page: number;
  hasNextPage: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  mode: "browse" | "sweep";
}) {
  return (
    <div className="space-y-2">
      <div className="relative min-w-0 flex-1">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={mode === "sweep" ? "Filter mismatches by product, SKU, or barcode…" : "Search product, SKU, or barcode…"}
          className="min-h-11 w-full rounded-card border border-line bg-white py-2 pl-9 pr-10 text-[13px] text-ink placeholder:text-muted focus:border-stock focus:outline-none focus:ring-2 focus:ring-stock/20"
        />
        {loading && mode === "browse" ? (
          <Loader2
            size={15}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted"
          />
        ) : null}
      </div>
      {mode === "browse" ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted">
          <span>Page {page}</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={onPrevPage}
              aria-label="Previous page"
              className="inline-flex items-center gap-1 rounded-card border border-line bg-white px-2.5 py-1.5 text-[12px] font-medium text-ink transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              Prev
            </button>
            <button
              type="button"
              disabled={loading || !hasNextPage}
              onClick={onNextPage}
              aria-label="Next page"
              className="inline-flex items-center gap-1 rounded-card border border-line bg-white px-2.5 py-1.5 text-[12px] font-medium text-ink transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
