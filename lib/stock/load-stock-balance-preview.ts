import { fetchUbexInventoryAll, fetchUbexStockByIds, stockBalanceMaxItems } from "@/lib/ubex/inventory";
import {
  fetchAllShopifyInventoryAtLocation,
  getDefaultShopifyLocation,
  type ShopifyLocation,
} from "@/lib/shopify/inventory-read";
import {
  buildStockBalanceRows,
  summarizeStockBalanceRows,
  type StockBalanceRow,
} from "./build-balance-rows";

export type StockBalancePreview = {
  rows: StockBalanceRow[];
  location: ShopifyLocation;
  fetchedAt: string;
  itemCount: number;
  summary: ReturnType<typeof summarizeStockBalanceRows>;
};

/** Read-only: Ubex list + Shopify inventory join by barcode. No writes. */
export async function loadStockBalancePreview(): Promise<StockBalancePreview> {
  const location = await getDefaultShopifyLocation();
  let ubexItems = await fetchUbexInventoryAll();

  // Fresh get-stock only for smaller catalogs (list already includes available_qty).
  const ids = ubexItems.map((i) => i.id);
  const maxItems = stockBalanceMaxItems();
  const refreshStock = ids.length > 0 && (maxItems !== null ? ids.length <= maxItems : ids.length <= 200);
  if (refreshStock) {
    try {
      const fresh = await fetchUbexStockByIds(ids);
      ubexItems = ubexItems.map((item) => ({
        ...item,
        stock: fresh.get(item.id) ?? item.stock,
      }));
    } catch (e) {
      console.warn("[stock-balance] Ubex get-stock failed, using list stock:", e);
    }
  }

  const shopifyByBarcode = await fetchAllShopifyInventoryAtLocation(location.id);
  const rows = buildStockBalanceRows(ubexItems, shopifyByBarcode);

  return {
    rows,
    location,
    fetchedAt: new Date().toISOString(),
    itemCount: ubexItems.length,
    summary: summarizeStockBalanceRows(rows),
  };
}
