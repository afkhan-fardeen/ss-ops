import {
  fetchUbexInventoryAll,
  fetchUbexInventoryPage,
  fetchUbexStockByIds,
  searchUbexInventory,
  type UbexInventoryItem,
} from "@/lib/ubex/inventory";
import {
  fetchAllShopifyInventoryAtLocation,
  fetchShopifyInventoryByBarcodes,
  getDefaultShopifyLocation,
  type ShopifyLocation,
} from "@/lib/shopify/inventory-read";
import { isStore2Configured } from "@/lib/store2/client";
import {
  buildStockBalanceRows,
  summarizeStockBalanceRows,
  type StockBalanceRow,
} from "./build-balance-rows";

const PAGE_SIZE = 10;

export type StockBalanceMode = "browse" | "sweep";

export type StockBalancePreview = {
  rows: StockBalanceRow[];
  location: ShopifyLocation;
  locationB: ShopifyLocation | null;
  store2Configured: boolean;
  fetchedAt: string;
  itemCount: number;
  page: number;
  hasNextPage: boolean;
  search: string;
  mode: StockBalanceMode;
  summary: ReturnType<typeof summarizeStockBalanceRows>;
};

async function enrichUbexStock(items: UbexInventoryItem[]): Promise<UbexInventoryItem[]> {
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

async function buildPreviewFromUbex(
  ubexItems: UbexInventoryItem[],
  page: number,
  search: string,
): Promise<StockBalancePreview> {
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

  return {
    rows,
    location,
    locationB,
    store2Configured,
    fetchedAt: new Date().toISOString(),
    itemCount: ubexItems.length,
    page,
    hasNextPage: ubexItems.length >= PAGE_SIZE,
    search,
    mode: "browse",
    summary: summarizeStockBalanceRows(rows),
  };
}

/** Default browse view — Ubex page N (10 items), both stores by barcode. */
export async function loadStockBalancePage(page = 1): Promise<StockBalancePreview> {
  const safePage = Math.max(1, Math.floor(page) || 1);
  let ubexItems = await fetchUbexInventoryPage(safePage);
  ubexItems = await enrichUbexStock(ubexItems);
  return buildPreviewFromUbex(ubexItems, safePage, "");
}

/** Search view — Ubex ?search= + page. */
export async function searchStockBalance(
  query: string,
  page = 1,
): Promise<StockBalancePreview> {
  const q = query.trim();
  const safePage = Math.max(1, Math.floor(page) || 1);
  if (!q) return loadStockBalancePage(safePage);
  let ubexItems = await searchUbexInventory(q, safePage);
  ubexItems = await enrichUbexStock(ubexItems);
  return buildPreviewFromUbex(ubexItems, safePage, q);
}

/** Full Ubex catalog joined to both stores — no row filter. */
export async function loadStockBalanceCatalog(): Promise<StockBalancePreview> {
  const ubexItems = await fetchUbexInventoryAll();
  const store2Configured = isStore2Configured();
  const location = await getDefaultShopifyLocation(1);
  let locationB: ShopifyLocation | null = null;

  const storeAPromise = fetchAllShopifyInventoryAtLocation(location.id, 1);
  const storeBPromise = store2Configured
    ? (async () => {
        locationB = await getDefaultShopifyLocation(2);
        return fetchAllShopifyInventoryAtLocation(locationB.id, 2);
      })()
    : Promise.resolve(null);

  const [storeAByBarcode, storeBByBarcode] = await Promise.all([
    storeAPromise,
    storeBPromise,
  ]);

  const rows = buildStockBalanceRows(ubexItems, storeAByBarcode, storeBByBarcode);

  return {
    rows,
    location,
    locationB,
    store2Configured,
    fetchedAt: new Date().toISOString(),
    itemCount: rows.length,
    page: 1,
    hasNextPage: false,
    search: "",
    mode: "browse",
    summary: summarizeStockBalanceRows(rows),
  };
}

/** Mismatch sweep — full catalog, both stores, mismatch-only, no pagination. */
export async function loadMismatchedStockBalance(): Promise<StockBalancePreview> {
  const catalog = await loadStockBalanceCatalog();
  const rows = catalog.rows.filter((row) => row.mismatch);
  return {
    ...catalog,
    rows,
    itemCount: rows.length,
    mode: "sweep",
    summary: summarizeStockBalanceRows(rows),
  };
}

/** @deprecated Use loadStockBalancePage / searchStockBalance */
export async function loadStockBalancePreview(): Promise<StockBalancePreview> {
  return loadStockBalancePage(1);
}
