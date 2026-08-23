"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useStockBalancePreview } from "@/hooks/useStockBalancePreview";
import { StockBalanceView } from "@/components/stock/StockBalanceView";

export function StockBalanceLoader() {
  const { preview, loading, error, search, load, refresh } = useStockBalancePreview();
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);

  useEffect(() => {
    if (!preview && !loading && !error) {
      void load({ page: 1, search: "" });
    }
  }, [preview, loading, error, load]);

  async function handleSearchChange(value: string) {
    await load({ search: value, page: 1, append: false });
  }

  async function handleLoadMore() {
    if (!preview?.hasNextPage) return;
    setLoadMoreLoading(true);
    try {
      await load({
        search: preview.search || search,
        page: preview.page + 1,
        append: true,
        silent: true,
      });
    } finally {
      setLoadMoreLoading(false);
    }
  }

  if (loading && !preview) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-line bg-white py-16 shadow-soft">
        <Loader2 size={28} className="animate-spin-slow text-muted" />
        <p className="text-[13px] font-medium text-ink">Loading stock…</p>
        <p className="max-w-sm text-center text-[12px] text-muted">
          Fetching the first page from Ubex and matching Shopify barcodes.
        </p>
      </div>
    );
  }

  if (error && !preview) {
    return (
      <div className="space-y-3">
        <div className="rounded-card border border-[#C25151]/30 bg-[rgba(194,81,81,0.08)] px-4 py-3 text-[13px] text-[#C25151]">
          {error}
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="focus-ring rounded-card border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-ink transition hover:bg-canvas"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!preview) return null;

  return (
    <StockBalanceView
      rows={preview.rows}
      locationName={preview.location.name}
      locationId={preview.location.id}
      locationBName={preview.locationB?.name ?? null}
      store2Configured={preview.store2Configured}
      fetchedAt={preview.fetchedAt}
      itemCount={preview.itemCount}
      page={preview.page}
      hasNextPage={preview.hasNextPage}
      search={preview.search}
      summary={preview.summary}
      refreshLoading={loading}
      loadMoreLoading={loadMoreLoading}
      onSearchChange={(v) => void handleSearchChange(v)}
      onLoadMore={() => void handleLoadMore()}
      onRefresh={() => void refresh({ silent: true })}
    />
  );
}
