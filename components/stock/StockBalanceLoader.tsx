"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useStockBalancePreview } from "@/hooks/useStockBalancePreview";
import { StockBalanceView } from "@/components/stock/StockBalanceView";

export function StockBalanceLoader() {
  const { preview, loading, error, refresh } = useStockBalancePreview();

  useEffect(() => {
    if (!preview && !loading && !error) {
      void refresh();
    }
  }, [preview, loading, error, refresh]);

  if (loading && !preview) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-[#EBEBEB] bg-white py-16 shadow-soft">
        <Loader2 size={28} className="animate-spin-slow text-[#999999]" />
        <p className="text-[13px] font-medium text-[#111111]">Loading full Ubex catalog…</p>
        <p className="max-w-sm text-center text-[12px] text-[#999999]">
          Fetching products from Ubex and matching Shopify by barcode. Large catalogs may take
          a minute — Ubex limits how fast we can page inventory. You can leave this page; you
          will get a notification when the refresh finishes.
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
          className="focus-ring rounded-card border border-[#EBEBEB] bg-white px-3 py-1.5 text-[12px] font-medium text-[#111111] transition hover:bg-[#F7F7F7]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!preview) return null;

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center gap-2 rounded-card border border-[#EBEBEB] bg-[#F7F7F7] px-4 py-2.5 text-[12px] text-[#555555]">
          <Loader2 size={14} className="animate-spin-slow shrink-0 text-[#999999]" />
          Refreshing catalog in background…
        </div>
      ) : null}
      <StockBalanceView
        rows={preview.rows}
        locationName={preview.location.name}
        locationId={preview.location.id}
        fetchedAt={preview.fetchedAt}
        itemCount={preview.itemCount}
        summary={preview.summary}
        refreshLoading={loading}
        onRefresh={() => void refresh()}
      />
    </div>
  );
}
