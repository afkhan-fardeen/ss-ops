import { getSupabaseService } from "@/lib/supabase/service";
import { loadStockRestockActivity } from "./load-stock-restock-activity";
import type { DailyStatusSplit } from "./bucket-by-day";
import type { StoreComparisonItem } from "@/lib/stock/record-mismatch-snapshot";

export type MismatchTrendPoint = {
  label: string;
  value: number;
  capturedAt: string;
};

export type RepeatOffender = {
  barcode: string;
  ubexId: string;
  errorCount: number;
};

export type CatalogComposition = {
  matched: number;
  unlinked: number;
  ambiguous: number;
  skipped: number;
};

export type StockAnalysisSummary = {
  latest: {
    capturedAt: string;
    totalItems: number;
    mismatched: number;
    composition: CatalogComposition;
    storeComparison: StoreComparisonItem[];
  } | null;
  trend: MismatchTrendPoint[];
  cleanSyncRate14d: number | null;
  syncErrors14d: number;
  dailyStatus: DailyStatusSplit[];
  repeatOffenders: RepeatOffender[];
  error: string | null;
};

type SnapshotRow = {
  captured_at: string;
  total_items: number;
  matched_count: number;
  mismatched_count: number;
  unlinked_count: number;
  ambiguous_count: number;
  skipped_count: number;
  store_comparison: unknown;
};

function parseStoreComparison(raw: unknown): StoreComparisonItem[] {
  if (!Array.isArray(raw)) return [];
  const out: StoreComparisonItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.barcode !== "string") continue;
    out.push({
      barcode: rec.barcode,
      productName: typeof rec.productName === "string" ? rec.productName : rec.barcode,
      committedA: typeof rec.committedA === "number" ? rec.committedA : 0,
      committedB: typeof rec.committedB === "number" ? rec.committedB : 0,
    });
  }
  return out;
}

function trendLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export async function loadStockAnalysisSummary(): Promise<StockAnalysisSummary> {
  const activity = await loadStockRestockActivity(14);
  const empty: StockAnalysisSummary = {
    latest: null,
    trend: [],
    cleanSyncRate14d: null,
    syncErrors14d: 0,
    dailyStatus: activity.dailyStatus,
    repeatOffenders: [],
    error: activity.error,
  };

  const success14 = activity.dailyStatus.reduce((s, d) => s + d.success, 0);
  const error14 = activity.dailyStatus.reduce((s, d) => s + d.error, 0);
  const decided = success14 + error14;
  empty.cleanSyncRate14d = decided === 0 ? null : Math.round((success14 / decided) * 100);
  empty.syncErrors14d = error14;

  const supabase = getSupabaseService();
  if (!supabase) return { ...empty, error: empty.error ?? "Supabase not configured" };

  try {
    const { data: snaps, error: snapErr } = await supabase
      .from("stock_mismatch_snapshots")
      .select(
        "captured_at, total_items, matched_count, mismatched_count, unlinked_count, ambiguous_count, skipped_count, store_comparison",
      )
      .order("captured_at", { ascending: false })
      .limit(20);
    if (snapErr) throw new Error(snapErr.message);

    const rows = (snaps ?? []) as SnapshotRow[];
    const newest = rows[0] ?? null;
    const chronological = [...rows].reverse();

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 13);
    since.setUTCHours(0, 0, 0, 0);

    const { data: errors, error: errErr } = await supabase
      .from("stock_restock_log")
      .select("barcode, ubex_id, created_at")
      .eq("status", "error")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(1000);
    if (errErr) throw new Error(errErr.message);

    const byBarcode = new Map<string, { count: number; ubexId: string }>();
    for (const row of (errors ?? []) as { barcode: string; ubex_id: string }[]) {
      const bc = row.barcode.trim();
      if (!bc) continue;
      const prev = byBarcode.get(bc);
      if (prev) prev.count += 1;
      else byBarcode.set(bc, { count: 1, ubexId: row.ubex_id });
    }

    const repeatOffenders = [...byBarcode.entries()]
      .filter(([, v]) => v.count >= 2)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8)
      .map(([barcode, v]) => ({ barcode, ubexId: v.ubexId, errorCount: v.count }));

    return {
      latest: newest
        ? {
            capturedAt: newest.captured_at,
            totalItems: newest.total_items,
            mismatched: newest.mismatched_count,
            composition: {
              matched: newest.matched_count,
              unlinked: newest.unlinked_count,
              ambiguous: newest.ambiguous_count,
              skipped: newest.skipped_count,
            },
            storeComparison: parseStoreComparison(newest.store_comparison),
          }
        : null,
      trend: chronological.map((r) => ({
        label: trendLabel(r.captured_at),
        value: r.mismatched_count,
        capturedAt: r.captured_at,
      })),
      cleanSyncRate14d: empty.cleanSyncRate14d,
      syncErrors14d: empty.syncErrors14d,
      dailyStatus: activity.dailyStatus,
      repeatOffenders,
      error: null,
    };
  } catch (e) {
    return {
      ...empty,
      error: e instanceof Error ? e.message : "Failed to load stock analysis",
    };
  }
}
