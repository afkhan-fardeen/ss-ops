import type { UbexInventoryItem } from "@/lib/ubex/inventory";
import type { ShopifyVariantInventory } from "@/lib/shopify/inventory-read";
import { sharedAvailable } from "./stock-balance-target";

export type StockBalanceStatus =
  | "matched"
  | "unlinked"
  | "ambiguous"
  | "skipped"
  | "store-b-not-listed";

export type StoreInventorySide = {
  onHand: number | null;
  available: number | null;
  committed: number | null;
  variantId: string | null;
  inventoryItemId: string | null;
  variantLabel: string | null;
};

export type MatchingVariant = { store: "A" | "B"; label: string };

export type StockBalanceRow = {
  ubexId: string;
  productName: string;
  sku: string;
  barcode: string;
  ubexStock: number;
  storeA: StoreInventorySide;
  storeB: StoreInventorySide | null;
  sharedAvailable: number | null;
  status: StockBalanceStatus;
  mismatch: boolean;
  restockable: boolean;
  skipReason?: "no-barcode" | "not-tracking";
  matchingVariants?: MatchingVariant[];
  /** @deprecated Prefer storeA — kept for transitional UI/scripts */
  shopifyOnHand: number | null;
  shopifyAvailable: number | null;
  shopifyCommitted: number | null;
  delta: number | null;
  shopifyVariantLabel: string | null;
  shopifyVariantId: string | null;
  shopifyInventoryItemId: string | null;
};

function normalizeBarcode(raw: string): string {
  return raw.trim();
}

function emptySide(): StoreInventorySide {
  return {
    onHand: null,
    available: null,
    committed: null,
    variantId: null,
    inventoryItemId: null,
    variantLabel: null,
  };
}

function matchingFrom(
  store: "A" | "B",
  variants: ShopifyVariantInventory[],
): MatchingVariant[] {
  return variants.map((v) => ({
    store,
    label: v.displayName || v.barcode,
  }));
}

function sideFromVariants(
  variants: ShopifyVariantInventory[],
): { side: StoreInventorySide; ambiguous: boolean; unlinked: boolean } {
  if (variants.length === 0) {
    return { side: emptySide(), ambiguous: false, unlinked: true };
  }
  if (variants.length > 1) {
    return {
      side: {
        ...emptySide(),
        variantLabel: `${variants.length} variants`,
      },
      ambiguous: true,
      unlinked: false,
    };
  }
  const v = variants[0]!;
  return {
    side: {
      onHand: v.onHand,
      available: v.available,
      committed: v.committed,
      variantId: v.variantId,
      inventoryItemId: v.inventoryItemId,
      variantLabel: v.displayName,
    },
    ambiguous: false,
    unlinked: false,
  };
}

function legacyFields(storeA: StoreInventorySide, shared: number | null) {
  return {
    shopifyOnHand: storeA.onHand,
    shopifyAvailable: storeA.available,
    shopifyCommitted: storeA.committed,
    delta:
      shared !== null && storeA.available !== null ? shared - storeA.available : null,
    shopifyVariantLabel: storeA.variantLabel,
    shopifyVariantId: storeA.variantId,
    shopifyInventoryItemId: storeA.inventoryItemId,
  };
}

export function buildStockBalanceRows(
  ubexItems: UbexInventoryItem[],
  storeAByBarcode: Map<string, ShopifyVariantInventory[]>,
  storeBByBarcode: Map<string, ShopifyVariantInventory[]> | null,
): StockBalanceRow[] {
  const rows: StockBalanceRow[] = [];
  const store2Enabled = storeBByBarcode !== null;

  for (const item of ubexItems) {
    const barcode = normalizeBarcode(item.barcode);
    const sku = (item.sku ?? "").trim();

    if (!barcode || !item.trackQty) {
      const storeA = emptySide();
      rows.push({
        ubexId: item.id,
        productName: item.name,
        sku,
        barcode: barcode || "",
        ubexStock: item.stock,
        storeA,
        storeB: store2Enabled ? emptySide() : null,
        sharedAvailable: null,
        status: "skipped",
        mismatch: false,
        restockable: false,
        skipReason: !barcode ? "no-barcode" : "not-tracking",
        ...legacyFields(storeA, null),
      });
      continue;
    }

    const aVariants = storeAByBarcode.get(barcode) ?? [];
    const bVariants = store2Enabled ? storeBByBarcode!.get(barcode) ?? [] : [];
    const a = sideFromVariants(aVariants);
    const b = store2Enabled ? sideFromVariants(bVariants) : null;

    if (a.ambiguous || (b?.ambiguous ?? false)) {
      const matchingVariants = [
        ...(a.ambiguous ? matchingFrom("A", aVariants) : []),
        ...(b?.ambiguous ? matchingFrom("B", bVariants) : []),
      ];
      rows.push({
        ubexId: item.id,
        productName: item.name,
        sku,
        barcode,
        ubexStock: item.stock,
        storeA: a.side,
        storeB: b ? b.side : null,
        sharedAvailable: null,
        status: "ambiguous",
        mismatch: false,
        restockable: false,
        matchingVariants,
        ...legacyFields(a.side, null),
      });
      continue;
    }

    const aLinked = !a.unlinked;
    const bLinked = b ? !b.unlinked : false;

    if (!aLinked && !bLinked) {
      rows.push({
        ubexId: item.id,
        productName: item.name,
        sku,
        barcode,
        ubexStock: item.stock,
        storeA: a.side,
        storeB: store2Enabled ? emptySide() : null,
        sharedAvailable: null,
        status: "unlinked",
        mismatch: false,
        restockable: false,
        ...legacyFields(a.side, null),
      });
      continue;
    }

    const storeBSide: StoreInventorySide | null = store2Enabled
      ? bLinked
        ? b!.side
        : null
      : null;

    const shared = sharedAvailable(
      item.stock,
      aLinked ? a.side.committed : 0,
      storeBSide?.committed ?? 0,
    );

    const aMismatch =
      aLinked && a.side.available !== null && a.side.available !== shared;
    const bMismatch =
      storeBSide != null &&
      storeBSide.available !== null &&
      storeBSide.available !== shared;
    const mismatch = aMismatch || bMismatch;
    const notListedOnB = store2Enabled && aLinked && !bLinked;

    rows.push({
      ubexId: item.id,
      productName: item.name,
      sku,
      barcode,
      ubexStock: item.stock,
      storeA: aLinked ? a.side : emptySide(),
      storeB: store2Enabled ? storeBSide : null,
      sharedAvailable: shared,
      status: notListedOnB ? "store-b-not-listed" : "matched",
      mismatch,
      restockable: mismatch && (aLinked || bLinked),
      ...legacyFields(aLinked ? a.side : emptySide(), shared),
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
    if (r.mismatch) mismatched++;
    if (r.status === "matched" || r.status === "store-b-not-listed") matched++;
    else if (r.status === "unlinked") unlinked++;
    else if (r.status === "ambiguous") ambiguous++;
    else if (r.status === "skipped") skipped++;
  }
  return { matched, unlinked, ambiguous, skipped, mismatched };
}
