import { fetchUbexStockByIds } from "@/lib/ubex/inventory";
import { setShopifyOnHand } from "@/lib/shopify/inventory-write";
import {
  fetchShopifyVariantsByBarcode,
  getDefaultShopifyLocation,
  type ShopifyStoreId,
  type ShopifyVariantInventory,
} from "@/lib/shopify/inventory-read";
import { isStore2Configured } from "@/lib/store2/client";
import {
  claimRestockIdempotency,
  logStockRestock,
  releaseRestockIdempotency,
  restockIdempotencyKey,
} from "./restock-log";
import { targetShopifyOnHandForStore } from "./stock-balance-target";

export type SyncItemInput = {
  ubexId: string;
  barcode: string;
};

export type StoreSyncResult = {
  storeId: ShopifyStoreId;
  ok: boolean;
  skipped?: boolean;
  idempotent?: boolean;
  error?: string;
  previousOnHand?: number;
  newOnHand?: number;
  available?: number;
  committed?: number;
  targetOnHand?: number;
};

export type SyncItemResult = {
  ubexId: string;
  barcode: string;
  ok: boolean;
  ubexStock?: number;
  sharedAvailable?: number;
  stores: StoreSyncResult[];
  error?: string;
};

function normalizeBarcode(raw: string): string {
  return raw.trim();
}

function normalizeUbexId(raw: string): string {
  return raw.trim();
}

async function resolveVariant(
  barcode: string,
  storeId: ShopifyStoreId,
): Promise<
  | { ok: true; locationId: number; variant: ShopifyVariantInventory }
  | { ok: false; error: string }
> {
  try {
    const location = await getDefaultShopifyLocation(storeId);
    const variants = await fetchShopifyVariantsByBarcode(barcode, location.id, storeId);
    if (variants.length === 0) {
      return { ok: false, error: `Store ${storeId}: no Shopify variant for barcode` };
    }
    if (variants.length > 1) {
      return {
        ok: false,
        error: `Store ${storeId}: ambiguous (${variants.length} variants)`,
      };
    }
    return { ok: true, locationId: location.id, variant: variants[0]! };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : `Store ${storeId}: lookup failed`,
    };
  }
}

async function writeStoreOnHand(params: {
  storeId: ShopifyStoreId;
  ubexId: string;
  barcode: string;
  ubexStock: number;
  locationId: number;
  variant: ShopifyVariantInventory;
  targetOnHand: number;
  createdBy: string | null;
}): Promise<StoreSyncResult> {
  const {
    storeId,
    ubexId,
    barcode,
    ubexStock,
    locationId,
    variant,
    targetOnHand,
    createdBy,
  } = params;
  const previousOnHand = variant.onHand;
  const committed = variant.committed;

  if (targetOnHand === previousOnHand) {
    await logStockRestock({
      ubexId,
      barcode,
      shopifyInventoryItemId: variant.inventoryItemId,
      locationId,
      storeId,
      ubexQty: ubexStock,
      previousOnHand,
      newOnHand: previousOnHand,
      committed,
      status: "skipped",
      createdBy,
    });
    return {
      storeId,
      ok: true,
      skipped: true,
      previousOnHand,
      newOnHand: previousOnHand,
      available: variant.available,
      committed,
      targetOnHand,
    };
  }

  const idemKey = restockIdempotencyKey(barcode, locationId, targetOnHand);
  const reserved = await claimRestockIdempotency({
    key: idemKey,
    barcode,
    locationId,
    storeId,
    createdBy,
  });

  if (!reserved) {
    return {
      storeId,
      ok: true,
      idempotent: true,
      previousOnHand,
      newOnHand: previousOnHand,
      available: variant.available,
      committed,
      targetOnHand,
    };
  }

  try {
    await setShopifyOnHand(
      variant.inventoryItemId,
      locationId,
      targetOnHand,
      previousOnHand,
      idemKey,
      storeId,
    );
  } catch (e) {
    await releaseRestockIdempotency(idemKey);
    const message = e instanceof Error ? e.message : "Shopify inventory update failed";
    await logStockRestock({
      ubexId,
      barcode,
      shopifyInventoryItemId: variant.inventoryItemId,
      locationId,
      storeId,
      ubexQty: ubexStock,
      previousOnHand,
      committed,
      status: "error",
      error: message,
      createdBy,
    });
    return {
      storeId,
      ok: false,
      error: message,
      previousOnHand,
      committed,
      targetOnHand,
    };
  }

  const after = await fetchShopifyVariantsByBarcode(barcode, locationId, storeId);
  const updated = after[0];

  await logStockRestock({
    ubexId,
    barcode,
    shopifyInventoryItemId: variant.inventoryItemId,
    locationId,
    storeId,
    ubexQty: ubexStock,
    previousOnHand,
    newOnHand: updated?.onHand ?? targetOnHand,
    committed: updated?.committed ?? committed,
    status: "success",
    createdBy,
  });

  return {
    storeId,
    ok: true,
    previousOnHand,
    newOnHand: updated?.onHand ?? targetOnHand,
    available: updated?.available,
    committed: updated?.committed ?? committed,
    targetOnHand,
  };
}

/** Sync one SKU to Shopify from Ubex across configured stores (shared-pool formula). */
export async function syncItemAcrossStores(
  input: SyncItemInput,
  createdBy: string | null,
): Promise<SyncItemResult> {
  const ubexId = normalizeUbexId(input.ubexId);
  const barcode = normalizeBarcode(input.barcode);
  const base = { ubexId, barcode, ok: false as const, stores: [] as StoreSyncResult[] };

  if (!ubexId || !barcode) {
    return { ...base, error: "Missing ubexId or barcode" };
  }

  const freshUbex = await fetchUbexStockByIds([ubexId]);
  const ubexStock = freshUbex.get(ubexId);
  if (ubexStock === undefined) {
    return { ...base, error: "Ubex quantity not found for id" };
  }

  const store2 = isStore2Configured();
  const [aRes, bRes] = await Promise.all([
    resolveVariant(barcode, 1),
    store2 ? resolveVariant(barcode, 2) : Promise.resolve(null),
  ]);

  if (!aRes.ok && (!bRes || !bRes.ok)) {
    return {
      ...base,
      ubexStock,
      error: aRes.ok === false ? aRes.error : "No linked Shopify variants",
    };
  }

  const committedA = aRes.ok ? aRes.variant.committed : 0;
  const committedB = bRes && bRes.ok ? bRes.variant.committed : 0;
  const shared = Math.max(0, Math.floor(ubexStock - committedA - committedB));

  const stores: StoreSyncResult[] = [];

  if (aRes.ok) {
    const targetA = targetShopifyOnHandForStore(ubexStock, committedB);
    stores.push(
      await writeStoreOnHand({
        storeId: 1,
        ubexId,
        barcode,
        ubexStock,
        locationId: aRes.locationId,
        variant: aRes.variant,
        targetOnHand: targetA,
        createdBy,
      }),
    );
  } else if (aRes.ok === false) {
    stores.push({ storeId: 1, ok: false, error: aRes.error });
  }

  if (store2) {
    if (bRes && bRes.ok) {
      const targetB = targetShopifyOnHandForStore(ubexStock, committedA);
      stores.push(
        await writeStoreOnHand({
          storeId: 2,
          ubexId,
          barcode,
          ubexStock,
          locationId: bRes.locationId,
          variant: bRes.variant,
          targetOnHand: targetB,
          createdBy,
        }),
      );
    } else if (bRes && !bRes.ok) {
      // Not listed on Store B is fine when Store A synced — only error if A also failed
      stores.push({
        storeId: 2,
        ok: true,
        skipped: true,
        error: bRes.error.includes("no Shopify variant")
          ? "Not listed on Store B"
          : bRes.error,
      });
    }
  }

  const ok = stores.some((s) => s.ok && !s.error) || stores.every((s) => s.ok);
  const hardFail = stores.length > 0 && stores.every((s) => !s.ok);

  return {
    ubexId,
    barcode,
    ok: !hardFail && stores.some((s) => s.ok),
    ubexStock,
    sharedAvailable: shared,
    stores,
    error: hardFail ? stores.map((s) => s.error).filter(Boolean).join("; ") : undefined,
  };
}

/** @deprecated Use syncItemAcrossStores */
export async function restockItemToUbex(
  input: SyncItemInput,
  createdBy: string | null,
): Promise<SyncItemResult> {
  return syncItemAcrossStores(input, createdBy);
}

export async function syncItemsAcrossStores(
  items: SyncItemInput[],
  createdBy: string | null,
): Promise<SyncItemResult[]> {
  const results: SyncItemResult[] = [];
  for (const item of items) {
    results.push(await syncItemAcrossStores(item, createdBy));
  }
  return results;
}

/** @deprecated Use syncItemsAcrossStores */
export async function restockItemsToUbex(
  items: SyncItemInput[],
  createdBy: string | null,
): Promise<SyncItemResult[]> {
  return syncItemsAcrossStores(items, createdBy);
}
