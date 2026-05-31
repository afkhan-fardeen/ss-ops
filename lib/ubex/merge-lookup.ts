import type { UbexLookup } from "./lookup-types";

/** Union secondary (e.g. Supabase ubex_cache) into primary without overwriting existing keys. */
export function mergeUbexLookups(primary: UbexLookup, secondary: UbexLookup): void {
  for (const [k, v] of secondary.refToTracking) {
    if (!primary.refToTracking.has(k)) primary.refToTracking.set(k, v);
  }
  for (const [k, v] of secondary.trackingUrls) {
    if (!primary.trackingUrls.has(k)) primary.trackingUrls.set(k, v);
  }
  for (const [l4, tracking] of secondary.last4ToTracking) {
    if (secondary.last4Conflicts.has(l4)) continue;
    if (primary.last4Conflicts.has(l4)) continue;
    const existing = primary.last4ToTracking.get(l4);
    if (!existing) {
      primary.last4ToTracking.set(l4, tracking);
    } else if (existing !== tracking) {
      primary.last4ToTracking.delete(l4);
      primary.last4Conflicts.add(l4);
    }
  }
  primary.totalShipments = Math.max(primary.totalShipments, secondary.totalShipments);
}

export function lookupHasEntries(lookup: UbexLookup | Map<string, string> | undefined): boolean {
  if (!lookup) return false;
  if (lookup instanceof Map) return lookup.size > 0;
  return lookup.refToTracking.size > 0 || lookup.last4ToTracking.size > 0;
}
