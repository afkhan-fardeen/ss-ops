import {
  fetchUbexInventoryAll,
  fetchUbexInventoryPage,
  searchUbexInventory,
  type UbexInventoryItem,
} from "@/lib/ubex/inventory";
import {
  fetchAllShopifyInventoryAtLocation,
  getDefaultShopifyLocation,
  type ShopifyLocation,
} from "@/lib/shopify/inventory-read";
import { isStore2Configured } from "@/lib/store2/client";
import {
  buildStockBalanceRows,
  summarizeStockBalanceRows,
  type StockBalanceRow,
} from "./build-balance-rows";
import { enrichUbexStock, joinUbexItemsToShopify } from "./join-ubex-shopify";
import { buildStoreComparison, buildCommitmentCatalogSummary, recordMismatchSnapshot } from "./record-mismatch-snapshot";

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

async function buildPreviewFromUbex(
  ubexItems: UbexInventoryItem[],
  page: number,
  search: string,
): Promise<StockBalancePreview> {
  const joined = await joinUbexItemsToShopify(ubexItems);

  return {
    rows: joined.rows,
    location: joined.location,
    locationB: joined.locationB,
    store2Configured: joined.store2Configured,
    fetchedAt: new Date().toISOString(),
    itemCount: ubexItems.length,
    page,
    hasNextPage: ubexItems.length >= PAGE_SIZE,
    search,
    mode: "browse",
    summary: summarizeStockBalanceRows(joined.rows),
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

/**
 * Full-catalog loads are expensive (Ubex returns 10 items per request and is rate-limited), and several
 * screens need the same data. Share one load between concurrent callers (single-flight) and reuse the
 * result for a short TTL. Restocks invalidate it, so writes are never followed by stale reads.
 */
const CATALOG_TTL_MS =
  (Number.parseInt(process.env.STOCK_CATALOG_CACHE_SECONDS ?? "90", 10) || 90) * 1000;
let catalogCache: { at: number; value: StockBalancePreview } | null = null;
let catalogInflight: Promise<StockBalancePreview> | null = null;

export function invalidateStockCatalog(): void {
  catalogCache = null;
}

/** Full Ubex catalog joined to both stores — no row filter. Pass `fresh: true` to bypass the cache. */
export async function loadStockBalanceCatalog(opts?: { fresh?: boolean }): Promise<StockBalancePreview> {
  if (!opts?.fresh && catalogCache && Date.now() - catalogCache.at < CATALOG_TTL_MS) {
    return catalogCache.value;
  }
  if (catalogInflight) return catalogInflight;

  const startedAt = Date.now();
  const promise = fetchStockBalanceCatalogLive()
    .then((value) => {
      catalogCache = { at: startedAt, value };
      return value;
    })
    .finally(() => {
      if (catalogInflight === promise) catalogInflight = null;
    });
  catalogInflight = promise;
  return promise;
}

async function fetchStockBalanceCatalogLive(): Promise<StockBalancePreview> {
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
export async function loadMismatchedStockBalance(
  capturedBy?: string | null,
): Promise<StockBalancePreview> {
  const catalog = await loadStockBalanceCatalog({ fresh: true });
  const commitment = buildCommitmentCatalogSummary(catalog.rows);
  try {
    await recordMismatchSnapshot({
      totalItems: catalog.itemCount,
      matched: catalog.summary.matched,
      mismatched: catalog.summary.mismatched,
      unlinked: catalog.summary.unlinked,
      ambiguous: catalog.summary.ambiguous,
      skipped: catalog.summary.skipped,
      storeComparison: buildStoreComparison(catalog.rows),
      commitment,
      capturedBy,
    });
  } catch (e) {
    console.warn("[stock-mismatch-snapshot] insert threw:", e);
  }

  const rows = catalog.rows.filter((row) => row.mismatch);
  return {
    ...catalog,
    rows,
    itemCount: rows.length,
    mode: "sweep",
    summary: summarizeStockBalanceRows(rows),
  };
}
