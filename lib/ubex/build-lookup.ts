import type { ShopifyOrder } from "@/lib/shopify/types";
import { readAllUbexCache, upsertUbexCache } from "@/lib/supabase/ubex-cache";
import { lastDigits, normalizeOrderRef } from "./normalize";
import { getUbexToken } from "./client";
import { fetchShipmentListPage, type UbexListShipmentRow } from "./list-shipments";
import {
  collectReferenceStringsFromDetails,
  extractTrackingUrlFromDetails,
  fetchShipmentDetails,
  keyLooksReferenceLike,
} from "./shipment-details";

const DETAIL_CONCURRENCY = Number.parseInt(process.env.UBEX_DETAIL_CONCURRENCY ?? "12", 10) || 12;
const DEFAULT_MAX_LIST_PAGES = Number.parseInt(process.env.UBEX_MAX_LIST_PAGES ?? "3", 10) || 3;
const DEFAULT_MAX_DETAIL_FETCHES =
  Number.parseInt(process.env.UBEX_MAX_DETAIL_FETCHES ?? "150", 10) || 150;
const LOOKUP_TTL_MS =
  (Number.parseInt(process.env.UBEX_LOOKUP_TTL_SECONDS ?? "60", 10) || 60) * 1000;

export type UbexLookup = {
  /** Normalized ref → tracking id (full-string match). */
  refToTracking: Map<string, string>;
  /** Last-4 digits → tracking id (single hit). If a last-4 maps to multiple trackings, it is removed from here. */
  last4ToTracking: Map<string, string>;
  /** Last-4 digits that had collisions (ambiguous). */
  last4Conflicts: Set<string>;
  /** Tracking id → tracking URL (as returned by Ubex details `tracking_url`). */
  trackingUrls: Map<string, string>;
  /** Total unique Ubex shipments seen. */
  totalShipments: number;
  /** Informational message from Ubex (e.g. "API disabled. Contact administrator for support."). */
  apiMessage?: string;
  /** Error surfaced from list/details calls (network, auth, etc.). */
  error?: string;
};

export type BuildUbexLookupOptions = {
  /** Shopify order last-4 digits we want to resolve. Lets the builder short-circuit once all are matched. */
  needed?: Set<string>;
  /** Bypass the module-level TTL cache. */
  force?: boolean;
};

/** Module-level memoisation keyed by token. Prevents 25 s recomputes on every page load. */
const CACHE = new Map<string, { at: number; value: UbexLookup }>();

/**
 * Hydration state for Supabase `ubex_cache`. We only do it once per process boot so subsequent
 * page loads skip the network trip even if the TTL cache expired.
 */
let hydratedFromSupabase = false;
let hydratingPromise: Promise<UbexLookup | null> | null = null;

function indexFullRef(raw: string, tracking: string, map: Map<string, string>) {
  const k = normalizeOrderRef(raw);
  if (k.length >= 2) map.set(k, tracking);
}

function indexLast4(
  raw: string,
  tracking: string,
  last4ToTracking: Map<string, string>,
  last4Sets: Map<string, Set<string>>,
) {
  const l4 = lastDigits(raw, 4);
  if (!l4) return;
  let set = last4Sets.get(l4);
  if (!set) {
    set = new Set<string>();
    last4Sets.set(l4, set);
  }
  set.add(tracking);
  if (set.size === 1) {
    last4ToTracking.set(l4, tracking);
  } else {
    last4ToTracking.delete(l4);
  }
}

function indexStringsFromListRow(
  row: UbexListShipmentRow,
  tracking: string,
  refToTracking: Map<string, string>,
  last4ToTracking: Map<string, string>,
  last4Sets: Map<string, Set<string>>,
) {
  for (const [key, val] of Object.entries(row)) {
    if (key === "tracking" || key === "log" || key === "status" || key === "last_update") continue;
    if (!keyLooksReferenceLike(key)) continue;
    if (typeof val === "string" && val.trim()) {
      indexFullRef(val, tracking, refToTracking);
      indexLast4(val, tracking, last4ToTracking, last4Sets);
    } else if (typeof val === "number" && Number.isFinite(val)) {
      const s = String(val);
      indexFullRef(s, tracking, refToTracking);
      indexLast4(s, tracking, last4ToTracking, last4Sets);
    }
  }
}

function registerRefsForTracking(
  refs: string[],
  tracking: string,
  refToTracking: Map<string, string>,
  last4ToTracking: Map<string, string>,
  last4Sets: Map<string, Set<string>>,
) {
  for (const raw of refs) {
    indexFullRef(raw, tracking, refToTracking);
    indexLast4(raw, tracking, last4ToTracking, last4Sets);
  }
}

function allNeededMatched(needed: Set<string> | undefined, last4ToTracking: Map<string, string>): boolean {
  if (!needed || needed.size === 0) return false;
  for (const n of needed) {
    if (!last4ToTracking.has(n)) return false;
  }
  return true;
}

function emptyLookup(): UbexLookup {
  return {
    refToTracking: new Map(),
    last4ToTracking: new Map(),
    last4Conflicts: new Set(),
    trackingUrls: new Map(),
    totalShipments: 0,
  };
}

async function hydrateFromSupabase(token: string): Promise<UbexLookup | null> {
  if (hydratedFromSupabase) return null;
  if (!hydratingPromise) {
    hydratingPromise = (async () => {
      const rows = await readAllUbexCache();
      hydratedFromSupabase = true;
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
      const value: UbexLookup = {
        refToTracking,
        last4ToTracking,
        last4Conflicts,
        trackingUrls,
        totalShipments: rows.length,
      };
      CACHE.set(token, { at: Date.now(), value });
      return value;
    })();
  }
  return hydratingPromise;
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

  // Cold boot: hydrate from Supabase before hitting Ubex. If every requested last-4 is satisfied by the
  // cache we can return immediately without any Ubex API calls.
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
      if (page > 1 && newOnPage === 0) break;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const list = [...trackings];
  const capped = list.slice(0, DEFAULT_MAX_DETAIL_FETCHES);

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
    // Early-exit: stop burning Ubex calls once every requested Shopify last-4 is matched.
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
      // Recover a barcode candidate from the full-ref map (best-effort; the full-ref includes sender_barcode).
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

  return value;
}

/**
 * Back-compat: returns only the legacy full-ref map (used by routes that haven't adopted the richer lookup yet).
 */
export async function buildUbexReferenceToTrackingMap(): Promise<Map<string, string>> {
  const lookup = await buildUbexLookup();
  return lookup.refToTracking;
}

/**
 * Resolve the Ubex tracking id for a Shopify order. Prefers full-ref match; falls back to last-4 digit match.
 * Returns empty string on ambiguous last-4 collisions (so we never guess wrong).
 */
export function ubexTrackingForShopifyOrder(
  order: ShopifyOrder,
  lookup: UbexLookup | Map<string, string>,
): string {
  const refToTracking = lookup instanceof Map ? lookup : lookup.refToTracking;
  const last4ToTracking = lookup instanceof Map ? null : lookup.last4ToTracking;

  const candidates: string[] = [];
  if (order.name) candidates.push(order.name);
  if (order.order_number != null) {
    candidates.push(String(order.order_number));
    candidates.push(`#${order.order_number}`);
  }
  candidates.push(String(order.id));
  candidates.push(`#${order.id}`);

  const seen = new Set<string>();
  for (const c of candidates) {
    const k = normalizeOrderRef(c);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    const hit = refToTracking.get(k);
    if (hit) return hit;
  }

  if (last4ToTracking) {
    const l4Seen = new Set<string>();
    for (const c of candidates) {
      const l4 = lastDigits(c, 4);
      if (!l4 || l4Seen.has(l4)) continue;
      l4Seen.add(l4);
      const hit = last4ToTracking.get(l4);
      if (hit) return hit;
    }
  }

  return "";
}

/** Derive the set of Shopify order last-4 digit keys used by `needed` early-exit. */
export function shopifyLast4Set(orders: ShopifyOrder[]): Set<string> {
  const out = new Set<string>();
  for (const o of orders) {
    for (const raw of [o.name, o.order_number != null ? String(o.order_number) : "", String(o.id)]) {
      const l4 = lastDigits(raw, 4);
      if (l4) out.add(l4);
    }
  }
  return out;
}
