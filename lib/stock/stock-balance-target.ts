import type { StockBalanceRow } from "@/lib/stock/build-balance-rows";

/** Shopify on_hand needed so available matches Ubex sellable (committed preserved). */
export function targetShopifyOnHand(
  ubexStock: number,
  committed: number | null,
): number {
  return Math.max(0, Math.floor(ubexStock + (committed ?? 0)));
}

/** Matched row where Ubex sellable ≠ Shopify available. */
export function isSellableMismatch(row: StockBalanceRow): boolean {
  return row.status === "matched" && row.delta !== null && row.delta !== 0;
}
