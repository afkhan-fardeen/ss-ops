import type { StockBalanceRow } from "@/lib/stock/build-balance-rows";
import { isSellableMismatch } from "@/lib/stock/stock-balance-target";

export type StockBalanceFilterState = {
  quantityMismatchOnly: boolean;
  noCommittedOnly: boolean;
  hideUnlinked: boolean;
  hideAmbiguous: boolean;
};

export const DEFAULT_STOCK_BALANCE_FILTERS: StockBalanceFilterState = {
  quantityMismatchOnly: false,
  noCommittedOnly: false,
  hideUnlinked: false,
  hideAmbiguous: false,
};

export const WEEKLY_RESTOCK_PRESET: StockBalanceFilterState = {
  quantityMismatchOnly: true,
  noCommittedOnly: true,
  hideUnlinked: true,
  hideAmbiguous: true,
};

export function applyStockBalanceFilters(
  rows: StockBalanceRow[],
  filters: StockBalanceFilterState,
): StockBalanceRow[] {
  return rows.filter((row) => {
    if (filters.quantityMismatchOnly && !isSellableMismatch(row)) return false;
    if (filters.noCommittedOnly && (row.shopifyCommitted ?? 0) !== 0) return false;
    if (filters.hideUnlinked && row.status === "unlinked") return false;
    if (filters.hideAmbiguous && row.status === "ambiguous") return false;
    return true;
  });
}

export function filtersAreActive(filters: StockBalanceFilterState): boolean {
  return (
    filters.quantityMismatchOnly ||
    filters.noCommittedOnly ||
    filters.hideUnlinked ||
    filters.hideAmbiguous
  );
}
