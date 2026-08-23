import { getSupabaseService } from "@/lib/supabase/service";
import {
  getTopSellingProducts,
  getTotalUnitsSold,
  type SalesWindow,
  type TopSellingProduct,
} from "@/lib/analysis/sales-aggregates";
import type { ShortProduct } from "@/lib/analysis/commitment";

export type StockAnalysisSummary = {
  latest: {
    capturedAt: string;
    totalCommitted: number | null;
    canBeSent: number | null;
    productsShort: number | null;
    shortProducts: ShortProduct[];
  } | null;
  unitsSold14d: number;
  bestSellers30d: TopSellingProduct[];
  error: string | null;
};

type SnapshotRow = {
  captured_at: string;
  total_committed: number | null;
  can_be_sent: number | null;
  products_short: number | null;
  short_products: unknown;
};

function parseShortProducts(raw: unknown): ShortProduct[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is ShortProduct =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as ShortProduct).barcode === "string" &&
        typeof (item as ShortProduct).productName === "string",
    )
    .map((item) => ({
      barcode: item.barcode,
      productName: item.productName,
      shortBy: Number(item.shortBy) || 0,
      totalCommitted: Number(item.totalCommitted) || 0,
      ubexStock: Number(item.ubexStock) || 0,
    }));
}

export async function loadStockAnalysisSummary(
  salesWindow: SalesWindow = 30,
): Promise<StockAnalysisSummary> {
  const supabase = getSupabaseService();
  if (!supabase) {
    return {
      latest: null,
      unitsSold14d: 0,
      bestSellers30d: [],
      error: "Supabase is not configured.",
    };
  }

  const [snapshotRes, unitsSold14d, bestSellers] = await Promise.all([
    supabase
      .from("stock_mismatch_snapshots")
      .select("captured_at, total_committed, can_be_sent, products_short, short_products")
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getTotalUnitsSold(14),
    getTopSellingProducts(salesWindow, 10),
  ]);

  if (snapshotRes.error) {
    return {
      latest: null,
      unitsSold14d,
      bestSellers30d: bestSellers,
      error: snapshotRes.error.message,
    };
  }

  const row = snapshotRes.data as SnapshotRow | null;
  const latest = row
    ? {
        capturedAt: row.captured_at,
        totalCommitted: row.total_committed,
        canBeSent: row.can_be_sent,
        productsShort: row.products_short,
        shortProducts: parseShortProducts(row.short_products),
      }
    : null;

  return {
    latest,
    unitsSold14d,
    bestSellers30d: bestSellers,
    error: null,
  };
}
