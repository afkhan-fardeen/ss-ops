/**
 * Pure, synchronous helpers for indexing and querying the Ubex lookup.
 * No async I/O, no Supabase, no env vars — safe to import from any context.
 */
import type { ShopifyOrder } from "@/lib/shopify/types";
import { lastDigits, normalizeOrderRef } from "./normalize";
import { keyLooksReferenceLike } from "./shipment-details";
import type { UbexListShipmentRow } from "./list-shipments";
import type { UbexLookup } from "./lookup-types";

export function indexFullRef(raw: string, tracking: string, map: Map<string, string>) {
  const k = normalizeOrderRef(raw);
  if (k.length >= 2) map.set(k, tracking);
}

export function indexLast4(
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

export function indexStringsFromListRow(
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

export function registerRefsForTracking(
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

export function allNeededMatched(
  needed: Set<string> | undefined,
  last4ToTracking: Map<string, string>,
): boolean {
  if (!needed || needed.size === 0) return false;
  for (const n of needed) {
    if (!last4ToTracking.has(n)) return false;
  }
  return true;
}

export function emptyLookup(): UbexLookup {
  return {
    refToTracking: new Map(),
    last4ToTracking: new Map(),
    last4Conflicts: new Set(),
    trackingUrls: new Map(),
    totalShipments: 0,
  };
}

/** Derive the set of Shopify order last-4 digit keys used by the `needed` early-exit. */
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

/**
 * Resolve the Ubex tracking id for a Shopify order.
 * Prefers full-ref match; falls back to last-4 digit match.
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
