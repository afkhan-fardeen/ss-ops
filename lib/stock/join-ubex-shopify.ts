import {
  fetchUbexStockByIds,
  type UbexInventoryItem,
} from "@/lib/ubex/inventory";
import {
  fetchShopifyInventoryByBarcodes,
  getDefaultShopifyLocation,
  type ShopifyLocation,
} from "@/lib/shopify/inventory-read";
import { isStore2Configured } from "@/lib/store2/client";
import { buildStockBalanceRows, type StockBalanceRow } from "./build-balance-rows";

export async function enrichUbexStock(items: UbexInventoryItem[]): Promise<UbexInventoryItem[]> {
  if (items.length === 0) return items;
  try {
    const fresh = await fetchUbexStockByIds(items.map((i) => i.id));
    return items.map((item) => ({
      ...item,
      stock: fresh.get(item.id) ?? item.stock,
    }));
  } catch (e) {
    console.warn("[stock-balance] Ubex get-stock failed, using list stock:", e);
    return items;
  }
}

export async function joinUbexItemsToShopify(ubexItems: UbexInventoryItem[]): Promise<{
  rows: StockBalanceRow[];
  store2Configured: boolean;
  location: ShopifyLocation;
  locationB: ShopifyLocation | null;
}> {
  const store2Configured = isStore2Configured();
  const location = await getDefaultShopifyLocation(1);
  let locationB: ShopifyLocation | null = null;

  const barcodes = ubexItems.map((i) => i.barcode.trim()).filter(Boolean);

  const storeAPromise = fetchShopifyInventoryByBarcodes(barcodes, location.id, 1);
  const storeBPromise = store2Configured
    ? (async () => {
        locationB = await getDefaultShopifyLocation(2);
        return fetchShopifyInventoryByBarcodes(barcodes, locationB.id, 2);
      })()
    : Promise.resolve(null);

  const [storeAByBarcode, storeBByBarcode] = await Promise.all([storeAPromise, storeBPromise]);
  const rows = buildStockBalanceRows(ubexItems, storeAByBarcode, storeBByBarcode);

  return { rows, store2Configured, location, locationB };
}
