"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useUrlViewState } from "@/hooks/useUrlViewState";
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
    mode,
    load,
    refresh,
    loadMismatches,
    refreshMismatches,
    exitSweep,
  } = useStockBalancePreview();
  const { searchParams, updateUrl } = useUrlViewState();

  useEffect(() => {
    if (!preview && !loading && !error && !sweepLoading) {
      const initialSearch = searchParams.get("q") ?? "";
      const initialPage = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
      void load({ search: initialSearch, page: initialPage });
    }
    // Restore only on first mount — the handlers below own subsequent navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearchChange(value: string) {
    updateUrl({ search: value, page: 1 });
    await load({ search: value, page: 1 });
  }

  async function goToPage(page: number) {
    if (page < 1 || mode === "sweep") return;
    updateUrl({ page });
    await load({ search: preview?.search, page });
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
      sweepLoading={sweepLoading}
      onSearchChange={(v) => void handleSearchChange(v)}
      onPrevPage={() => void goToPage(preview.page - 1)}
      onNextPage={() => void goToPage(preview.page + 1)}
      onFindMismatches={() => void loadMismatches()}
      onExitSweep={() => {
        updateUrl({ search: "", page: 1 });
        void exitSweep();
      }}
      onRefresh={() =>
        void (mode === "sweep" ? refreshMismatches() : refresh({ silent: true, page: preview.page }))
      }
      onAfterSync={
        mode === "sweep" ? undefined : () => void refresh({ silent: true, page: preview.page })
      }
    />
  );
}
