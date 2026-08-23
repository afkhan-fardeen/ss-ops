import type { StockBalanceRow } from "@/lib/stock/build-balance-rows";

/**
 * Target on_hand for one store so its available equals the shared pool:
 * available = on_hand − own_committed = ubex − other_committed − own_committed
 * ⇒ on_hand = ubex − other_committed
 */
export function targetShopifyOnHandForStore(
  ubexStock: number,
  otherStoreCommitted: number | null,
): number {
  return Math.max(0, Math.floor(ubexStock - (otherStoreCommitted ?? 0)));
}

/** Real remaining pool after both stores' committed orders. */
export function sharedAvailable(
  ubexStock: number,
  storeACommitted: number | null,
  storeBCommitted: number | null,
): number {
  return Math.max(
    0,
    Math.floor(ubexStock - (storeACommitted ?? 0) - (storeBCommitted ?? 0)),
  );
}

/**
 * @deprecated Single-store legacy: on_hand = ubex + committed so available ≈ ubex.
 * Prefer targetShopifyOnHandForStore for shared-pool syncs.
 */
export function targetShopifyOnHand(
  ubexStock: number,
  committed: number | null,
): number {
  return Math.max(0, Math.floor(ubexStock + (committed ?? 0)));
}

/** Row needs sync when shared-pool math disagrees with either store. */
export function isSellableMismatch(row: StockBalanceRow): boolean {
  return row.status === "matched" && row.mismatch;
}
