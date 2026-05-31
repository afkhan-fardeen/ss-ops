import { readAllUbexCache, upsertUbexCache } from "@/lib/supabase/ubex-cache";
import { getUbexToken } from "./client";
import { fetchShipmentListPage } from "./list-shipments";
import {
  collectReferenceStringsFromDetails,
  extractTrackingUrlFromDetails,
  fetchShipmentDetails,
} from "./shipment-details";
import type { UbexLookup, BuildUbexLookupOptions } from "./lookup-types";
import {
  indexFullRef,
  indexLast4,
  indexStringsFromListRow,
  registerRefsForTracking,
  allNeededMatched,
  emptyLookup,
} from "./lookup-helpers";
import { mergeUbexLookups } from "./merge-lookup";

// Re-export so callers don't need to update their imports.
export type { UbexLookup, BuildUbexLookupOptions } from "./lookup-types";
export { ubexTrackingForShopifyOrder, shopifyLast4Set } from "./lookup-helpers";

const DETAIL_CONCURRENCY = Number.parseInt(process.env.UBEX_DETAIL_CONCURRENCY ?? "12", 10) || 12;
const DEFAULT_MAX_LIST_PAGES = Number.parseInt(process.env.UBEX_MAX_LIST_PAGES ?? "3", 10) || 3;
const DEFAULT_MAX_DETAIL_FETCHES =
  Number.parseInt(process.env.UBEX_MAX_DETAIL_FETCHES ?? "150", 10) || 150;
const LOOKUP_TTL_MS =
  (Number.parseInt(process.env.UBEX_LOOKUP_TTL_SECONDS ?? "60", 10) || 60) * 1000;

/** Module-level memoisation keyed by token. Prevents 25 s recomputes on every page load. */
const CACHE = new Map<string, { at: number; value: UbexLookup }>();

/**
 * Hydration state for Supabase `ubex_cache`. We only do it once per process boot so subsequent
 * page loads skip the network trip even if the TTL cache expired.
 */
let hydratedFromSupabase = false;
let hydratingPromise: Promise<UbexLookup | null> | null = null;

async function buildLookupFromSupabase(): Promise<UbexLookup | null> {
  const rows = await readAllUbexCache();
  if (rows.length === 0) return null;
  const refToTracking = new Map<string, string>();
  const last4ToTracking = new Map<string, string>();
  const last4Sets = new Map<string, Set<string>>();
  const trackingUrls = new Map<string, string>();
  for (const row of rows) {
    const t = row.tracking;
    if (!t) continue;
    if (row.tracking_url) trackingUrls.set(t, row.tracking_url);
    const barcode = row.sender_barcode ?? "";
    if (barcode) {
      indexFullRef(barcode, t, refToTracking);
      indexLast4(barcode, t, last4ToTracking, last4Sets);
    }
  }
  const last4Conflicts = new Set<string>();
  for (const [l4, set] of last4Sets) if (set.size > 1) last4Conflicts.add(l4);
  return {
    refToTracking,
    last4ToTracking,
    last4Conflicts,
    trackingUrls,
    totalShipments: rows.length,
  };
}

async function hydrateFromSupabase(token: string): Promise<UbexLookup | null> {
  if (hydratedFromSupabase) return null;
  if (!hydratingPromise) {
    hydratingPromise = (async () => {
      const value = await buildLookupFromSupabase();
      hydratedFromSupabase = true;
      if (!value) return null;
      CACHE.set(token, { at: Date.now(), value });
      return value;
    })();
  }
  return hydratingPromise;
}

async function enrichLookupFromSupabaseCache(lookup: UbexLookup): Promise<UbexLookup> {
  const fromDb = await buildLookupFromSupabase().catch(() => null);
  if (fromDb) mergeUbexLookups(lookup, fromDb);
  return lookup;
}

/** Invalidate the TTL cache (called after we mutate Ubex state, e.g. a fulfillment). */
export function invalidateUbexLookup(): void {
  CACHE.clear();
}

/**
 * Build a Ubex lookup (full ref + last-4 digits) for matching Shopify orders to Ubex trackings.
 *
 * Optimisations:
 *  - TTL cache (default 60 s) keyed by Ubex token.
 *  - Optional `needed` Set<string> of Shopify last-4s — stops fetching details once every one is matched.
 *  - Lower defaults for list pages / detail cap / detail concurrency.
 */
export async function buildUbexLookup(options: BuildUbexLookupOptions = {}): Promise<UbexLookup> {
  const token = getUbexToken();
  if (!token) return emptyLookup();

  const cacheKey = token;
  if (!options.force) {
    const hit = CACHE.get(cacheKey);
    if (hit && Date.now() - hit.at < LOOKUP_TTL_MS) {
      if (allNeededMatched(options.needed, hit.value.last4ToTracking) || !options.needed) {
        return hit.value;
      }
    }
  }

  // Cold boot: hydrate from Supabase before hitting Ubex. If every requested last-4 is satisfied by
  // the cache we can return immediately without any Ubex API calls.
  if (!options.force) {
    const hydrated = await hydrateFromSupabase(cacheKey);
    if (hydrated && allNeededMatched(options.needed, hydrated.last4ToTracking)) {
      return hydrated;
    }
  }

  const refToTracking = new Map<string, string>();
  const last4ToTracking = new Map<string, string>();
  const last4Sets = new Map<string, Set<string>>();
  const trackingUrls = new Map<string, string>();
  const trackings = new Set<string>();
  let apiMessage: string | undefined;
  let error: string | undefined;

  try {
    for (let page = 1; page <= DEFAULT_MAX_LIST_PAGES; page++) {
      const { rows, apiMessage: pageMsg } = await fetchShipmentListPage(page);
      if (pageMsg && !apiMessage) apiMessage = pageMsg;
      if (rows.length === 0) break;
      let newOnPage = 0;
      for (const row of rows) {
        const t = typeof row.tracking === "string" ? row.tracking.trim() : "";
        if (!t) continue;
        indexStringsFromListRow(row, t, refToTracking, last4ToTracking, last4Sets);
        if (!trackings.has(t)) {
          trackings.add(t);
          newOnPage++;
        }
      }
      // Stop as soon as every requested Shopify order is matched — no need to fetch more pages.
      if (allNeededMatched(options.needed, last4ToTracking)) break;
      if (page > 1 && newOnPage === 0) break;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  // If the Ubex list fetch failed outright (or returned nothing), fall back to whatever the
  // Supabase cache has. Stale data is better than an empty table + a scary error banner.
  if (error && trackings.size === 0) {
    const fallback = await buildLookupFromSupabase().catch(() => null);
    if (fallback && fallback.totalShipments > 0) {
      return { ...fallback, error, apiMessage };
    }
  }

  // COD: skip all detail fetches when list data already matches every `needed` last-4
  if (options.skipDetailFetches && allNeededMatched(options.needed, last4ToTracking) && !error) {
    const last4ConflictsEarly = new Set<string>();
    for (const [l4, set] of last4Sets) {
      if (set.size > 1) last4ConflictsEarly.add(l4);
    }
    const valueEarly: UbexLookup = {
      refToTracking,
      last4ToTracking,
      last4Conflicts: last4ConflictsEarly,
      trackingUrls,
      totalShipments: trackings.size,
      apiMessage,
      error,
    };
    if (!error) {
      CACHE.set(cacheKey, { at: Date.now(), value: valueEarly });
      const listArr = [...trackings];
      const capEarly = listArr.slice(0, DEFAULT_MAX_DETAIL_FETCHES);
      const entries = capEarly.map((tracking) => {
        let sender_barcode: string | null = null;
        for (const [ref, t] of refToTracking) {
          if (t === tracking) {
            sender_barcode = ref;
            break;
          }
        }
        return { tracking, sender_barcode, tracking_url: trackingUrls.get(tracking) ?? null };
      });
      void upsertUbexCache(entries).catch((e) => console.warn("[ubex-cache] persist failed:", e));
    }
    return enrichLookupFromSupabaseCache(valueEarly);
  }

  const list = [...trackings];
  const maxDetailFetches = options.skipDetailFetches
    ? Math.min(24, DEFAULT_MAX_DETAIL_FETCHES)
    : DEFAULT_MAX_DETAIL_FETCHES;
  const capped = list.slice(0, maxDetailFetches);

  outer: for (let i = 0; i < capped.length; i += DETAIL_CONCURRENCY) {
    const slice = capped.slice(i, i + DETAIL_CONCURRENCY);
    await Promise.all(
      slice.map(async (tracking) => {
        try {
          const data = await fetchShipmentDetails(tracking);
          if (!data) return;
          const strings = collectReferenceStringsFromDetails(data);
          registerRefsForTracking(strings, tracking, refToTracking, last4ToTracking, last4Sets);
          const url = extractTrackingUrlFromDetails(data, tracking);
          if (url) trackingUrls.set(tracking, url);
        } catch {
          /* skip */
        }
      }),
    );
    if (allNeededMatched(options.needed, last4ToTracking)) break outer;
  }

  const last4Conflicts = new Set<string>();
  for (const [l4, set] of last4Sets) {
    if (set.size > 1) last4Conflicts.add(l4);
  }

  const value: UbexLookup = {
    refToTracking,
    last4ToTracking,
    last4Conflicts,
    trackingUrls,
    totalShipments: trackings.size,
    apiMessage,
    error,
  };

  // Cache only successful, non-error results so a transient failure doesn't pin empty data for 60 s.
  if (!error) {
    CACHE.set(cacheKey, { at: Date.now(), value });

    // Persist to Supabase in the background so cold boots can skip Ubex entirely.
    const entries = capped.map((tracking) => {
      let sender_barcode: string | null = null;
      for (const [ref, t] of refToTracking) {
        if (t === tracking) {
          sender_barcode = ref;
          break;
        }
      }
      return {
        tracking,
        sender_barcode,
        tracking_url: trackingUrls.get(tracking) ?? null,
      };
    });
    void upsertUbexCache(entries).catch((e) => console.warn("[ubex-cache] persist failed:", e));
  }

  return enrichLookupFromSupabaseCache(value);
}

/**
 * Back-compat: returns only the legacy full-ref map (used by routes that haven't adopted the richer lookup yet).
 */
export async function buildUbexReferenceToTrackingMap(): Promise<Map<string, string>> {
  const lookup = await buildUbexLookup();
  return lookup.refToTracking;
}
