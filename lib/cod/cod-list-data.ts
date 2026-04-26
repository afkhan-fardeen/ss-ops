import type { ShopifyOrder } from "@/lib/shopify/types";
import { fetchCodOrders } from "@/lib/shopify/fetch-cod-orders";
import { getCollectionWindow, getWindowForDateKey, type CollectionWindow } from "@/lib/datetime/collection-window";
import { getRates } from "@/lib/fx/getRates";
import { getCurrencyForCountry } from "@/lib/currency";
import { buildCodRows } from "@/lib/cod/build-rows";
import { buildUbexLookup, shopifyLast4Set, type UbexLookup } from "@/lib/ubex/build-lookup";

const MAX_PICK = 14;

/**
 * From URL: `dates` comma-separated, or `date` (legacy) single, or null → default to current window.
 */
export function parseCodListDateParam(params: { dates?: string; date?: string } | undefined): {
  dateKeys: string[] | null;
  /** Non-null = invalid; caller shows error */
  error: string | null;
} {
  const dFromDates = params?.dates?.trim();
  if (dFromDates) {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of dFromDates.split(",")) {
      const d = p.trim();
      if (!d) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        return { dateKeys: null, error: `Invalid date: ${d}` };
      }
      if (seen.has(d)) continue;
      seen.add(d);
      out.push(d);
    }
    if (out.length > MAX_PICK) {
      return { dateKeys: null, error: `Select at most ${MAX_PICK} days.` };
    }
    if (out.length > 0) {
      return { dateKeys: out, error: null };
    }
  }
  if (params?.date?.trim()) {
    const d = params.date.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return { dateKeys: null, error: "Invalid ?date= format (use YYYY-MM-DD)." };
    return { dateKeys: [d], error: null };
  }
  if (dFromDates === "") {
    return { dateKeys: null, error: null };
  }
  return { dateKeys: null, error: null };
}

function resolveDateKeys(dateKeys: string[] | null): string[] {
  if (dateKeys == null) return [getCollectionWindow().dateKey];
  return dateKeys;
}

function windowsForKeys(keys: string[]): CollectionWindow[] {
  return keys.map((k) => getWindowForDateKey(k));
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

function dedupeByOrderId(orders: ShopifyOrder[]): ShopifyOrder[] {
  const m = new Map<number, ShopifyOrder>();
  for (const o of orders) {
    m.set(o.id, o);
  }
  return [...m.values()];
}

export type LoadCodListDataResult = {
  ok: true;
  dateKeys: string[];
  windows: CollectionWindow[];
  /** Set only when a single day is selected (header + live dot) */
  singleWindow: CollectionWindow | null;
  /** After COD filter, dedupe, and window filter */
  codOrders: ShopifyOrder[];
  rows: ReturnType<typeof buildCodRows>;
  ratesView: { rates: Record<string, number>; fetchedAt: string; stale: boolean; source: string } | null;
  ubexLookup: UbexLookup | undefined;
  /** Post-COD, deduped, window-filtered count (matches "X COD" in UI) */
  ordersScannedInWindow: number;
  shouldUpsertUbexLinks: boolean;
  /** Min / max of selected windows’ ISO bounds (email log, export metadata) */
  rangeStartIso: string;
  rangeEndIso: string;
} | { ok: false; error: string };

/**
 * One loader for the COD list page, download, and email.
 */
export async function loadCodListData(params: { dates?: string; date?: string } | undefined): Promise<LoadCodListDataResult> {
  const parsed = parseCodListDateParam(params);
  if (parsed.error) {
    return { ok: false, error: parsed.error };
  }
  const dateKeys = resolveDateKeys(parsed.dateKeys);
  const windows = windowsForKeys(dateKeys);
  if (dateKeys.length === 0) {
    return { ok: false, error: "No dates selected." };
  }

  const todayKey = getCollectionWindow().dateKey;
  const shouldUpsertUbexLinks = dateKeys.length === 1 && dateKeys[0] === todayKey;

  const globalMin = windows.reduce(
    (min, w) => (Date.parse(w.createdAtMinIso) < Date.parse(min) ? w.createdAtMinIso : min),
    windows[0]!.createdAtMinIso,
  );
  const globalMax = windows.reduce(
    (max, w) => (Date.parse(w.createdAtMaxIso) > Date.parse(max) ? w.createdAtMaxIso : max),
    windows[0]!.createdAtMaxIso,
  );

  const { codOrders: rawCod } = await fetchCodOrders({
    createdAtMinIso: globalMin,
    createdAtMaxIso: globalMax,
    cacheStrategy: "prefer-cache",
  });

  const inWindows = rawCod.filter((o) => orderFallsInAnyWindow(o.created_at, windows));
  const codOrders = dedupeByOrderId(inWindows);
  const ordersScannedInWindow = codOrders.length;

  const currencies = codOrders
    .map((o) => getCurrencyForCountry(o.shipping_address?.country_code).currency)
    .filter((c): c is string => Boolean(c));
  const needed = shopifyLast4Set(codOrders);

  const [ratesResult, ubexResult] = await Promise.all([
    getRates(currencies),
    buildUbexLookup({ needed, skipDetailFetches: true }).catch((e) => {
      console.warn("[ubex] lookup failed:", e);
      return undefined as UbexLookup | undefined;
    }),
  ]);

  const ratesView = {
    rates: ratesResult.rates,
    fetchedAt: ratesResult.fetchedAt,
    stale: ratesResult.stale,
    source: ratesResult.source,
  };
  const rows = buildCodRows(codOrders, ratesResult.rates, ubexResult);

  const singleWindow = dateKeys.length === 1 ? getWindowForDateKey(dateKeys[0]!) : null;

  return {
    ok: true,
    dateKeys,
    windows,
    singleWindow,
    codOrders,
    rows,
    ratesView,
    ubexLookup: ubexResult,
    ordersScannedInWindow,
    shouldUpsertUbexLinks,
    rangeStartIso: globalMin,
    rangeEndIso: globalMax,
  };
}
