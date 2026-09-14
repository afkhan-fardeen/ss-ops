"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { StockAlertRow } from "@/lib/stock/compute-stock-alerts";
import { StockAlertsView } from "@/components/stock-alerts/StockAlertsView";

const TOAST_ID = "stock-alerts-scan";

type ScanResponse = {
  ok: boolean;
  error?: string;
  rows?: StockAlertRow[];
  scannedCount?: number;
  fetchedAt?: string;
};

export function StockAlertsLoader() {
  const [rows, setRows] = useState<StockAlertRow[] | null>(null);
  const [scannedCount, setScannedCount] = useState(0);
  const [fetchedAt, setFetchedAt] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setLoading(true);
    setError(null);
    toast.loading("Scanning stock levels…", { id: TOAST_ID });
    try {
      const res = await fetch("/api/stock-alerts/scan", { cache: "no-store" });
      const json = (await res.json()) as ScanResponse;
      if (!res.ok || !json.ok || !json.rows) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setRows(json.rows);
      setScannedCount(json.scannedCount ?? 0);
      setFetchedAt(json.fetchedAt ?? new Date().toISOString());
      const critical = json.rows.filter((r) => r.severity === "critical").length;
      toast.success(
        `Scan complete — ${critical} critical, ${json.rows.length - critical} warning`,
        { id: TOAST_ID, duration: 8_000 },
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to scan stock levels";
      setError(message);
      toast.error(message, { id: TOAST_ID });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void scan();
    // Scan once on mount only — the Rescan button owns subsequent refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && rows === null) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-line bg-white py-16 shadow-soft">
        <Loader2 size={28} className="animate-spin-slow text-muted" />
        <p className="text-[13px] font-medium text-ink">Scanning stock levels…</p>
        <p className="max-w-sm text-center text-[12px] text-muted">
          Joining the full Ubex catalog with both stores and checking 14-day sales velocity.
          Large catalogs may take a minute.
        </p>
      </div>
    );
  }

  if (error && rows === null) {
    return (
      <div className="space-y-3">
        <div className="rounded-card border border-[#C25151]/30 bg-[rgba(194,81,81,0.08)] px-4 py-3 text-[13px] text-[#C25151]">
          {error}
        </div>
        <button
          type="button"
          onClick={() => void scan()}
          className="focus-ring rounded-card border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-ink transition hover:bg-canvas"
        >
          Retry
        </button>
      </div>
    );
  }

  if (rows === null) return null;

  return (
    <StockAlertsView
      rows={rows}
      scannedCount={scannedCount}
      fetchedAt={fetchedAt}
      loading={loading}
      onRefresh={() => void scan()}
    />
  );
}
