import type { StockBalanceRow, StockBalanceStatus } from "@/lib/stock/build-balance-rows";

type UbexPoolVariant = {
  ubexId: string;
  barcode: string;
  sku: string;
  size: string | null;
  color: string | null;
  ubexStock: number;
  committedIntl: number | null;
  committedGcc: number | null;
  availableToSell: number | null;
  status: StockBalanceStatus;
};

export type UbexPoolProduct = {
  name: string;
  totalStock: number;
  committedIntl: number;
  committedGcc: number;
  availableToSell: number | null;
  variantCount: number;
  variants: UbexPoolVariant[];
};

function variantFromRow(row: StockBalanceRow): UbexPoolVariant {
  return {
    ubexId: row.ubexId,
    barcode: row.barcode,
    sku: row.sku,
    size: row.size,
    color: row.color,
    ubexStock: row.ubexStock,
    committedIntl: row.storeA.committed,
    committedGcc: row.storeB?.committed ?? null,
    availableToSell: row.sharedAvailable,
    status: row.status,
  };
}

/** Group joined Shopify+Ubex rows by product name for the Ubex Inventory browser. */
export function groupBalanceRowsByName(rows: StockBalanceRow[]): UbexPoolProduct[] {
  const map = new Map<string, StockBalanceRow[]>();
  for (const row of rows) {
    const key = row.productName.trim();
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }

  return Array.from(map.entries()).map(([name, group]) => {
    const variants = group.map(variantFromRow);
    const incomplete = group.some((r) => r.sharedAvailable === null);
    let availableToSell: number | null = 0;
    if (incomplete) {
      availableToSell = null;
    } else {
      availableToSell = group.reduce((sum, r) => sum + (r.sharedAvailable ?? 0), 0);
    }

    return {
      name,
      totalStock: group.reduce((sum, r) => sum + r.ubexStock, 0),
      committedIntl: group.reduce((sum, r) => sum + (r.storeA.committed ?? 0), 0),
      committedGcc: group.reduce((sum, r) => sum + (r.storeB?.committed ?? 0), 0),
      availableToSell,
      variantCount: variants.length,
      variants,
    };
  });
}
