import type { UbexInventoryItem } from "@/lib/ubex/inventory";
import type { ShopifyVariantInventory } from "@/lib/shopify/inventory-read";

export type StockBalanceStatus = "matched" | "unlinked" | "ambiguous" | "skipped";

export type StockBalanceRow = {
  ubexId: string;
  productName: string;
  barcode: string;
  ubexStock: number;
  shopifyOnHand: number | null;
  shopifyAvailable: number | null;
  shopifyCommitted: number | null;
  delta: number | null;
  status: StockBalanceStatus;
  shopifyVariantLabel: string | null;
  shopifyVariantId: string | null;
  shopifyInventoryItemId: string | null;
  restockable: boolean;
};

function normalizeBarcode(raw: string): string {
  return raw.trim();
}

function emptyShopifyIds(): {
  shopifyVariantId: null;
  shopifyInventoryItemId: null;
  restockable: false;
} {
  return { shopifyVariantId: null, shopifyInventoryItemId: null, restockable: false };
}

export function buildStockBalanceRows(
  ubexItems: UbexInventoryItem[],
  shopifyByBarcode: Map<string, ShopifyVariantInventory[]>,
): StockBalanceRow[] {
  const rows: StockBalanceRow[] = [];

  for (const item of ubexItems) {
    const barcode = normalizeBarcode(item.barcode);
    if (!barcode) {
      rows.push({
        ubexId: item.id,
        productName: item.name,
        barcode: "",
        ubexStock: item.stock,
        shopifyOnHand: null,
        shopifyAvailable: null,
        shopifyCommitted: null,
        delta: null,
        status: "skipped",
        shopifyVariantLabel: null,
        ...emptyShopifyIds(),
      });
      continue;
    }

    if (!item.trackQty) {
      rows.push({
        ubexId: item.id,
        productName: item.name,
        barcode,
        ubexStock: item.stock,
        shopifyOnHand: null,
        shopifyAvailable: null,
        shopifyCommitted: null,
        delta: null,
        status: "skipped",
        shopifyVariantLabel: null,
        ...emptyShopifyIds(),
      });
      continue;
    }

    const variants = shopifyByBarcode.get(barcode) ?? [];
    if (variants.length === 0) {
      rows.push({
        ubexId: item.id,
        productName: item.name,
        barcode,
        ubexStock: item.stock,
        shopifyOnHand: null,
        shopifyAvailable: null,
        shopifyCommitted: null,
        delta: null,
        status: "unlinked",
        shopifyVariantLabel: null,
        ...emptyShopifyIds(),
      });
      continue;
    }

    if (variants.length > 1) {
      rows.push({
        ubexId: item.id,
        productName: item.name,
        barcode,
        ubexStock: item.stock,
        shopifyOnHand: null,
        shopifyAvailable: null,
        shopifyCommitted: null,
        delta: null,
        status: "ambiguous",
        shopifyVariantLabel: `${variants.length} variants`,
        ...emptyShopifyIds(),
      });
      continue;
    }

    const v = variants[0]!;
    const delta = item.stock - v.onHand;
    rows.push({
      ubexId: item.id,
      productName: item.name,
      barcode,
      ubexStock: item.stock,
      shopifyOnHand: v.onHand,
      shopifyAvailable: v.available,
      shopifyCommitted: v.committed,
      delta,
      status: "matched",
      shopifyVariantLabel: v.displayName,
      shopifyVariantId: v.variantId,
      shopifyInventoryItemId: v.inventoryItemId,
      restockable: delta !== 0,
    });
  }

  return rows;
}

export function summarizeStockBalanceRows(rows: StockBalanceRow[]): {
  matched: number;
  unlinked: number;
  ambiguous: number;
  skipped: number;
  mismatched: number;
} {
  let matched = 0;
  let unlinked = 0;
  let ambiguous = 0;
  let skipped = 0;
  let mismatched = 0;
  for (const r of rows) {
    if (r.status === "matched") {
      matched++;
      if (r.delta !== null && r.delta !== 0) mismatched++;
    } else if (r.status === "unlinked") unlinked++;
    else if (r.status === "ambiguous") ambiguous++;
    else if (r.status === "skipped") skipped++;
  }
  return { matched, unlinked, ambiguous, skipped, mismatched };
}
