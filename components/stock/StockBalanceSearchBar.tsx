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
}: {
  value: string;
  onChange: (value: string) => void;
  loading: boolean;
  page: number;
  hasNextPage: boolean;
  onLoadMore: () => void;
  loadMoreLoading?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search product, SKU, or barcode…"
          className="min-h-11 w-full rounded-card border border-line bg-white py-2 pl-9 pr-10 text-[13px] text-ink placeholder:text-muted focus:border-stock focus:outline-none focus:ring-2 focus:ring-stock/20"
        />
        {loading ? (
          <Loader2
            size={15}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted"
          />
        ) : null}
      </div>
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
    </div>
  );
}
