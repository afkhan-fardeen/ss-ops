/** Store 2 COD list data loader.
 *  Mirrors lib/cod/cod-list-data.ts but:
 *  - Uses fetchStore2Orders instead of fetchCodOrders
 *  - Uses STORE2_FX_RATES instead of getRates()
 *  - No cod_list_day_cache writes (Store 2 always goes live)
 *  - upsertOrderUbexLinks with { storeId: 2 }
 */

import type { ShopifyOrder } from "@/lib/shopify/types";
import { getCollectionWindow, getWindowForDateKey, type CollectionWindow } from "@/lib/datetime/collection-window";
import { buildCodRows } from "@/lib/cod/build-rows";
import { buildUbexLookup, shopifyLast4Set, type UbexLookup } from "@/lib/ubex/build-lookup";
import { applyUbexRowFallbacks } from "@/lib/ubex/apply-row-fallbacks";
import { upsertOrderUbexLinks } from "@/lib/supabase/order-ubex-links";
import { parseCodListDateParam } from "@/lib/cod/cod-list-data";
import type { CodListSearchParamsInput } from "@/lib/cod/cod-list-params";
import { fetchStore2Orders } from "./fetch-orders";
import { STORE2_FX_RATES } from "./currency";
import { orderLooksLikeCod } from "@/lib/shopify/fetch-cod-orders";

function dedupeByOrderId(orders: ShopifyOrder[]): ShopifyOrder[] {
  const m = new Map<number, ShopifyOrder>();
  for (const o of orders) m.set(o.id, o);
  return [...m.values()];
}

function orderFallsInAnyWindow(createdAtIso: string | null | undefined, windows: CollectionWindow[]): boolean {
  if (!createdAtIso) return false;
  const t = Date.parse(createdAtIso);
  if (Number.isNaN(t)) return false;
  return windows.some((w) => {
    const a = Date.parse(w.createdAtMinIso);
    const b = Date.parse(w.createdAtMaxIso);
    return t >= a && t < b;
  });
}

function windowsForKeys(keys: string[]): CollectionWindow[] {
  return keys.map((k) => getWindowForDateKey(k));
}

export type LoadStore2CodListDataResult =
  | {
      ok: true;
      dateKeys: string[];
      windows: CollectionWindow[];
      singleWindow: CollectionWindow | null;
      codOrders: ShopifyOrder[];
      rows: ReturnType<typeof buildCodRows>;
      ratesView: { rates: Record<string, number>; fetchedAt: string; stale: boolean; source: string };
      ubexLookup: UbexLookup | undefined;
      ordersScannedInWindow: number;
      shouldUpsertUbexLinks: boolean;
      rangeStartIso: string;
      rangeEndIso: string;
    }
  | { ok: false; error: string };

async function loadInner(dateKeys: string[]): Promise<LoadStore2CodListDataResult> {
  if (dateKeys.length === 0) return { ok: false, error: "No dates selected." };

  const windows = windowsForKeys(dateKeys);
  const globalMin = windows.reduce(
    (min, w) => (Date.parse(w.createdAtMinIso) < Date.parse(min) ? w.createdAtMinIso : min),
    windows[0]!.createdAtMinIso,
  );
  const globalMax = windows.reduce(
    (max, w) => (Date.parse(w.createdAtMaxIso) > Date.parse(max) ? w.createdAtMaxIso : max),
    windows[0]!.createdAtMaxIso,
  );

  const { orders: allOrders } = await fetchStore2Orders({
    createdAtMinIso: globalMin,
    createdAtMaxIso: globalMax,
    cacheStrategy: "prefer-cache",
  });

  // Client-side COD filter + window filter (same logic as Store 1)
  const codOrders = dedupeByOrderId(
    allOrders.filter((o) => orderLooksLikeCod(o) && orderFallsInAnyWindow(o.created_at, windows)),
  );

  const ordersScannedInWindow = codOrders.length;
  const needed = shopifyLast4Set(codOrders);

  const ubexResult = await buildUbexLookup({ needed, skipDetailFetches: true }).catch((e) => {
    console.warn("[store2-ubex] lookup failed:", e);
    return undefined as UbexLookup | undefined;
  });

  let rows = buildCodRows(codOrders, STORE2_FX_RATES, ubexResult);
  rows = await applyUbexRowFallbacks(rows, codOrders.map((o) => o.id));

  const shouldUpsertUbexLinks = rows.some((r) => r.ubexId && !r.alreadyFulfilled);

  if (shouldUpsertUbexLinks) {
    const matches = rows
      .filter((r) => r.ubexId && !r.alreadyFulfilled)
      .map((r) => ({ shopifyOrderId: r.orderId, shopifyOrderName: r.orderName, ubexTracking: r.ubexId! }));
    void upsertOrderUbexLinks(matches, { storeId: 2 }).catch(() => {});
  }

  const singleWindow = dateKeys.length === 1 ? getWindowForDateKey(dateKeys[0]!) : null;

  return {
    ok: true,
    dateKeys,
    windows,
    singleWindow,
    codOrders,
    rows,
    ratesView: {
      rates: STORE2_FX_RATES,
      fetchedAt: new Date().toISOString(),
      stale: false,
      source: "static",
    },
    ubexLookup: ubexResult,
    ordersScannedInWindow,
    shouldUpsertUbexLinks,
    rangeStartIso: globalMin,
    rangeEndIso: globalMax,
  };
}

export async function loadStore2CodListData(
  params: CodListSearchParamsInput | undefined,
): Promise<LoadStore2CodListDataResult> {
  const parsed = parseCodListDateParam(params);
  if (parsed.error) return { ok: false, error: parsed.error };

  const dateKeys = parsed.dateKeys ?? [getCollectionWindow().dateKey];
  try {
    return await loadInner(dateKeys);
  } catch (e) {
    console.error("[store2-cod-list] load failed:", e);
    return { ok: false, error: e instanceof Error ? e.message : "Failed to load Store 2 COD list" };
  }
}
