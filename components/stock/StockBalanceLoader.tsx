"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { StockBalanceRow } from "@/lib/stock/build-balance-rows";
import { StockBalanceView } from "@/components/stock/StockBalanceView";

type PreviewPayload = {
  rows: StockBalanceRow[];
  location: { id: number; name: string };
  fetchedAt: string;
  itemCount: number;
  summary: {
    matched: number;
    unlinked: number;
    ambiguous: number;
    skipped: number;
    mismatched: number;
  };
};

export function StockBalanceLoader() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewPayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stock-balance/preview", { cache: "no-store" });
      const json = (await res.json()) as { ok: boolean; error?: string } & Partial<PreviewPayload>;
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setPreview(json as PreviewPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stock balance");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-[#EBEBEB] bg-white py-16 shadow-soft">
        <Loader2 size={28} className="animate-spin-slow text-[#999999]" />
        <p className="text-[13px] font-medium text-[#111111]">Loading full Ubex catalog…</p>
        <p className="max-w-sm text-center text-[12px] text-[#999999]">
          Fetching every product from Ubex and matching Shopify by barcode. This can take 1–3
          minutes for large catalogs.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="rounded-card border border-[#C25151]/30 bg-[rgba(194,81,81,0.08)] px-4 py-3 text-[13px] text-[#C25151]">
          {error}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="focus-ring rounded-card border border-[#EBEBEB] bg-white px-3 py-1.5 text-[12px] font-medium text-[#111111] transition hover:bg-[#F7F7F7]"
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
      fetchedAt={preview.fetchedAt}
      itemCount={preview.itemCount}
      summary={preview.summary}
      onRefresh={load}
    />
  );
}
