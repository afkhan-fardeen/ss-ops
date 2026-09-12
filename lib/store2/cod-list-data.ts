/** Store 2 (GCC) COD list data loader — the only COD pipeline; Store 1 no longer takes COD orders.
 *  - Uses fetchStore2Orders instead of fetchCodOrders
 *  - Always fetches live from Shopify (no order cache): COD is money-in-transit
 *    data, and a stale/incomplete cache silently drops orders from the list.
 *  - FX rates are derived from live GBP-based rates (getRates), cross-converted
 *    to AED since the GCC store's own currency is AED (not GBP).
 *  - upsertOrderUbexLinks with { storeId: 2 }
 */

import type { ShopifyOrder } from "@/lib/shopify/types";
import type { CollectionWindow } from "@/lib/datetime/collection-window";
import { getCollectionWindow, getWindowForDateKey } from "@/lib/datetime/collection-window";
import { buildCodRows } from "@/lib/cod/build-rows";
import { buildUbexLookup, shopifyLast4Set, type UbexLookup } from "@/lib/ubex/build-lookup";
import { applyUbexRowFallbacks } from "@/lib/ubex/apply-row-fallbacks";
import { upsertOrderUbexLinks } from "@/lib/supabase/order-ubex-links";
import { parseCodListDateParam, type CodListSearchParamsInput } from "@/lib/cod/cod-list-params";
import { windowsForKeys, orderFallsInAnyWindow, dedupeByOrderId } from "@/lib/cod/window-utils";
import { fetchStore2Orders } from "./fetch-orders";
import { orderLooksLikeCod } from "@/lib/shopify/fetch-cod-orders";
import { getRates } from "@/lib/fx/getRates";
import { getCurrencyForCountry } from "@/lib/currency";

const BASE_CURRENCY = "AED";

export type LoadStore2CodListDataResult =
  | {
      ok: true;
      dateKeys: string[];
      windows: CollectionWindow[];
      singleWindow: CollectionWindow | null;
      codOrders: ShopifyOrder[];
      rows: ReturnType<typeof buildCodRows>;
      ratesView: { base: string; rates: Record<string, number>; fetchedAt: string; stale: boolean; source: string };
      ubexLookup: UbexLookup | undefined;
      ordersScannedInWindow: number;
      shouldUpsertUbexLinks: boolean;
      rangeStartIso: string;
      rangeEndIso: string;
    }
  | { ok: false; error: string };

/** Cross-convert GBP-based rates ("1 GBP = X <ccy>") to AED-based ("1 AED = X <ccy>"). */
function toAedBasedRates(gbpRates: Record<string, number>): Record<string, number> | null {
  const aedPerGbp = gbpRates[BASE_CURRENCY];
  if (typeof aedPerGbp !== "number" || aedPerGbp <= 0) return null;
  const out: Record<string, number> = { [BASE_CURRENCY]: 1 };
  for (const [ccy, rate] of Object.entries(gbpRates)) {
    if (ccy === BASE_CURRENCY) continue;
    out[ccy] = rate / aedPerGbp;
  }
  return out;
}

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
    cacheStrategy: "live",
  });

  // Client-side COD filter + window filter (same logic as Store 1)
  const codOrders = dedupeByOrderId(
    allOrders.filter((o) => orderLooksLikeCod(o) && orderFallsInAnyWindow(o.created_at, windows)),
  );

  const ordersScannedInWindow = codOrders.length;
  const needed = shopifyLast4Set(codOrders);

  const destinationCurrencies = codOrders
    .map((o) => getCurrencyForCountry(o.shipping_address?.country_code).currency)
    .filter((c): c is string => Boolean(c));

  const [ubexResult, ratesResult] = await Promise.all([
    buildUbexLookup({ needed, skipDetailFetches: true }).catch((e) => {
      console.warn("[store2-ubex] lookup failed:", e);
      return undefined as UbexLookup | undefined;
    }),
    getRates(destinationCurrencies),
  ]);

  const aedRates = toAedBasedRates(ratesResult.rates);
  if (!aedRates) {
    return { ok: false, error: "AED exchange rate unavailable — cannot compute collection amounts." };
  }

  let rows = buildCodRows(codOrders, aedRates, ubexResult);
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
      base: BASE_CURRENCY,
      rates: aedRates,
      fetchedAt: ratesResult.fetchedAt,
      stale: ratesResult.stale,
      source: ratesResult.source,
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
