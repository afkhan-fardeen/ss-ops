import { fetchUbexInventoryUpTo, fetchUbexStockByIds, stockBalanceMaxItems } from "@/lib/ubex/inventory";
import {
  fetchShopifyInventoryByBarcodes,
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
  let ubexItems = await fetchUbexInventoryUpTo(stockBalanceMaxItems());

  const ids = ubexItems.map((i) => i.id);
  if (ids.length > 0) {
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

  const barcodes = ubexItems.map((i) => i.barcode).filter(Boolean);
  const shopifyByBarcode = await fetchShopifyInventoryByBarcodes(barcodes, location.id);
  const rows = buildStockBalanceRows(ubexItems, shopifyByBarcode);

  return {
    rows,
    location,
    fetchedAt: new Date().toISOString(),
    itemCount: ubexItems.length,
    summary: summarizeStockBalanceRows(rows),
  };
}
