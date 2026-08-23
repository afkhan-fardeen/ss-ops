import { getSupabaseService } from "@/lib/supabase/service";
import {
  buildCommitmentCatalogSummary,
  type ShortProduct,
} from "@/lib/analysis/commitment";
import type { StockBalanceRow } from "./build-balance-rows";

export type StoreComparisonItem = {
  barcode: string;
  productName: string;
  committedA: number;
  committedB: number;
};

export function buildStoreComparison(rows: StockBalanceRow[]): StoreComparisonItem[] {
  return rows
    .filter(
      (r) =>
        Boolean(r.barcode) &&
        r.storeA.committed != null &&
        r.storeB != null &&
        r.storeB.committed != null,
    )
    .map((r) => ({
      barcode: r.barcode,
      productName: r.productName,
      committedA: r.storeA.committed ?? 0,
      committedB: r.storeB!.committed ?? 0,
    }))
    .sort((a, b) => b.committedA + b.committedB - (a.committedA + a.committedB))
    .slice(0, 10);
}

export async function recordMismatchSnapshot(input: {
  totalItems: number;
  matched: number;
  mismatched: number;
  unlinked: number;
  ambiguous: number;
  skipped: number;
  storeComparison: StoreComparisonItem[];
  commitment?: {
    totalCommitted: number;
    canBeSent: number;
    productsShort: number;
    shortProducts: ShortProduct[];
  };
  capturedBy?: string | null;
}): Promise<void> {
  const supabase = getSupabaseService();
  if (!supabase) return;

  const { error } = await supabase.from("stock_mismatch_snapshots").insert({
    captured_by: input.capturedBy ?? null,
    total_items: input.totalItems,
    matched_count: input.matched,
    mismatched_count: input.mismatched,
    unlinked_count: input.unlinked,
    ambiguous_count: input.ambiguous,
    skipped_count: input.skipped,
    store_comparison: input.storeComparison,
    total_committed: input.commitment?.totalCommitted ?? null,
    can_be_sent: input.commitment?.canBeSent ?? null,
    products_short: input.commitment?.productsShort ?? null,
    short_products: input.commitment?.shortProducts ?? [],
  });
  if (error) {
    console.warn("[stock-mismatch-snapshot] insert failed:", error.message);
  }
}

export { buildCommitmentCatalogSummary };
