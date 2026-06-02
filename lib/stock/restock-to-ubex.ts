import { fetchUbexStockByIds } from "@/lib/ubex/inventory";
import { setShopifyOnHand } from "@/lib/shopify/inventory-write";
import {
  fetchShopifyVariantsByBarcode,
  getDefaultShopifyLocation,
} from "@/lib/shopify/inventory-read";
import {
  claimRestockIdempotency,
  logStockRestock,
  releaseRestockIdempotency,
  restockIdempotencyKey,
} from "./restock-log";

export type RestockItemInput = {
  ubexId: string;
  barcode: string;
};

export type RestockItemResult = {
  ubexId: string;
  barcode: string;
  ok: boolean;
  skipped?: boolean;
  idempotent?: boolean;
  error?: string;
  ubexStock?: number;
  previousOnHand?: number;
  newOnHand?: number;
  shopifyAvailable?: number;
  shopifyCommitted?: number;
};

function normalizeBarcode(raw: string): string {
  return raw.trim();
}

function normalizeUbexId(raw: string): string {
  return raw.trim();
}

/** Restock one matched SKU: Shopify on_hand ← fresh Ubex available_qty. No Ubex writes. */
export async function restockItemToUbex(
  input: RestockItemInput,
  createdBy: string | null,
): Promise<RestockItemResult> {
  const ubexId = normalizeUbexId(input.ubexId);
  const barcode = normalizeBarcode(input.barcode);
  const base = { ubexId, barcode, ok: false as const };

  if (!ubexId || !barcode) {
    return { ...base, ok: false, error: "Missing ubexId or barcode" };
  }

  const location = await getDefaultShopifyLocation();
  const variants = await fetchShopifyVariantsByBarcode(barcode, location.id);

  if (variants.length === 0) {
    return { ...base, ok: false, error: "Unlinked: no Shopify variant for barcode" };
  }
  if (variants.length > 1) {
    return { ...base, ok: false, error: `Ambiguous: ${variants.length} Shopify variants` };
  }

  const variant = variants[0]!;
  const previousOnHand = variant.onHand;
  const committed = variant.committed;

  const freshUbex = await fetchUbexStockByIds([ubexId]);
  const ubexStock = freshUbex.get(ubexId);
  if (ubexStock === undefined) {
    return { ...base, ok: false, error: "Ubex quantity not found for id" };
  }

  if (ubexStock === previousOnHand) {
    await logStockRestock({
      ubexId,
      barcode,
      shopifyInventoryItemId: variant.inventoryItemId,
      locationId: location.id,
      ubexQty: ubexStock,
      previousOnHand,
      newOnHand: previousOnHand,
      committed,
      status: "skipped",
      createdBy,
    });
    return {
      ubexId,
      barcode,
      ok: true,
      skipped: true,
      ubexStock,
      previousOnHand,
      newOnHand: previousOnHand,
      shopifyAvailable: variant.available,
      shopifyCommitted: committed,
    };
  }

  const idemKey = restockIdempotencyKey(barcode, location.id, ubexStock);
  const reserved = await claimRestockIdempotency({
    key: idemKey,
    barcode,
    locationId: location.id,
    createdBy,
  });

  if (!reserved) {
    return {
      ubexId,
      barcode,
      ok: true,
      idempotent: true,
      ubexStock,
      previousOnHand,
      newOnHand: previousOnHand,
      shopifyAvailable: variant.available,
      shopifyCommitted: committed,
    };
  }

  try {
    await setShopifyOnHand(variant.inventoryItemId, location.id, ubexStock);
  } catch (e) {
    await releaseRestockIdempotency(idemKey);
    const message = e instanceof Error ? e.message : "Shopify inventory update failed";
    await logStockRestock({
      ubexId,
      barcode,
      shopifyInventoryItemId: variant.inventoryItemId,
      locationId: location.id,
      ubexQty: ubexStock,
      previousOnHand,
      committed,
      status: "error",
      error: message,
      createdBy,
    });
    return { ...base, ok: false, error: message, ubexStock, previousOnHand };
  }

  const after = await fetchShopifyVariantsByBarcode(barcode, location.id);
  const updated = after[0];

  await logStockRestock({
    ubexId,
    barcode,
    shopifyInventoryItemId: variant.inventoryItemId,
    locationId: location.id,
    ubexQty: ubexStock,
    previousOnHand,
    newOnHand: updated?.onHand ?? ubexStock,
    committed: updated?.committed ?? committed,
    status: "success",
    createdBy,
  });

  return {
    ubexId,
    barcode,
    ok: true,
    ubexStock,
    previousOnHand,
    newOnHand: updated?.onHand ?? ubexStock,
    shopifyAvailable: updated?.available,
    shopifyCommitted: updated?.committed ?? committed,
  };
}

/** Bulk restock — sequential to avoid Shopify rate limits. */
export async function restockItemsToUbex(
  items: RestockItemInput[],
  createdBy: string | null,
): Promise<RestockItemResult[]> {
  const results: RestockItemResult[] = [];
  for (const item of items) {
    results.push(await restockItemToUbex(item, createdBy));
  }
  return results;
}
