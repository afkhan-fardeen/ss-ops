"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useStockBalancePreview } from "@/hooks/useStockBalancePreview";
import { StockBalanceView } from "@/components/stock/StockBalanceView";

function SweepLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-line bg-white py-16 shadow-soft">
      <Loader2 size={28} className="animate-spin-slow text-muted" />
      <p className="text-[13px] font-medium text-ink">Finding all mismatches…</p>
      <p className="max-w-sm text-center text-[12px] text-muted">
        Fetching products from Ubex and matching Shopify by barcode. Large catalogs may take
        a minute — Ubex limits how fast we can page inventory. You can leave this page; you
        will get a notification when the refresh finishes.
      </p>
    </div>
  );
}

export function StockBalanceLoader() {
  const {
    preview,
    loading,
    sweepLoading,
    error,
    search,
    mode,
    load,
    refresh,
    loadMismatches,
    refreshMismatches,
    exitSweep,
  } = useStockBalancePreview();
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);

  useEffect(() => {
    if (!preview && !loading && !error && !sweepLoading) {
      void load({ page: 1, search: "" });
    }
  }, [preview, loading, error, sweepLoading, load]);

  async function handleSearchChange(value: string) {
    await load({ search: value, page: 1, append: false });
  }

  async function handleLoadMore() {
    if (!preview?.hasNextPage || mode === "sweep") return;
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

  if (sweepLoading) {
    return <SweepLoadingState />;
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
          onClick={() => void (mode === "sweep" ? refreshMismatches() : refresh())}
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
      mode={mode}
      summary={preview.summary}
      refreshLoading={loading}
      loadMoreLoading={loadMoreLoading}
      sweepLoading={sweepLoading}
      onSearchChange={(v) => void handleSearchChange(v)}
      onLoadMore={() => void handleLoadMore()}
      onFindMismatches={() => void loadMismatches()}
      onExitSweep={() => void exitSweep()}
      onRefresh={() =>
        void (mode === "sweep" ? refreshMismatches() : refresh({ silent: true }))
      }
      onAfterSync={
        mode === "sweep" ? undefined : () => void refresh({ silent: true })
      }
    />
  );
}
