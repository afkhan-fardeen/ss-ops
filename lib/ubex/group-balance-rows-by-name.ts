import type { StockBalanceRow, StockBalanceStatus } from "@/lib/stock/build-balance-rows";

export type UbexPoolVariant = {
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

export function mergeUbexPoolProducts(existing: UbexPoolProduct[], incoming: UbexPoolProduct[]): UbexPoolProduct[] {
  const byId = new Map<string, UbexPoolVariant>();
  for (const v of [...existing, ...incoming].flatMap((p) => p.variants)) {
    byId.set(v.ubexId, v);
  }
  const syntheticRows: StockBalanceRow[] = [...byId.values()].map((v) => ({
    ubexId: v.ubexId,
    productName: existing.concat(incoming).find((p) => p.variants.some((x) => x.ubexId === v.ubexId))?.name ?? "",
    sku: v.sku,
    barcode: v.barcode,
    size: v.size,
    color: v.color,
    ubexStock: v.ubexStock,
    storeA: {
      onHand: null,
      available: null,
      committed: v.committedIntl,
      variantId: null,
      inventoryItemId: null,
      variantLabel: null,
    },
    storeB:
      v.committedGcc === null && v.status !== "store-b-not-listed"
        ? null
        : {
            onHand: null,
            available: null,
            committed: v.committedGcc,
            variantId: null,
            inventoryItemId: null,
            variantLabel: null,
          },
    sharedAvailable: v.availableToSell,
    status: v.status,
    mismatch: false,
    restockable: false,
    shopifyOnHand: null,
    shopifyAvailable: null,
    shopifyCommitted: null,
    delta: null,
    shopifyVariantLabel: null,
    shopifyVariantId: null,
    shopifyInventoryItemId: null,
  }));

  // Preserve product names from variants' original groups.
  const nameById = new Map<string, string>();
  for (const p of [...existing, ...incoming]) {
    for (const v of p.variants) nameById.set(v.ubexId, p.name);
  }
  for (const row of syntheticRows) {
    row.productName = nameById.get(row.ubexId) ?? row.productName;
  }

  return groupBalanceRowsByName(syntheticRows);
}
