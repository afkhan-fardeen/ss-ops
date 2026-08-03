/**
 * Fast single-order Ubex match: scan at most 2 recent list pages, no detail fetches.
 * Used by AWB lookup — never call buildUbexLookup for one order.
 */
import { getUbexToken } from "./client";
import { fetchShipmentListPage } from "./list-shipments";
import { lastDigits, normalizeOrderRef } from "./normalize";
import { indexStringsFromListRow } from "./lookup-helpers";

const MAX_LIST_PAGES = 2;

export type FindTrackingInput = {
  /** Trailing 4 digits of the Shopify order name / number. */
  last4: string;
  /** Full refs to try first (order name, order_number, etc.). */
  fullRefs?: string[];
};

/**
 * Prefer full-ref match on list rows; fall back to unique last-4.
 * Returns "" if not found or last-4 is ambiguous within the scanned pages.
 */
export async function findTrackingFromRecentList(
  input: FindTrackingInput,
): Promise<string> {
  if (!getUbexToken()) return "";

  const last4 = input.last4.trim();
  const fullKeys = (input.fullRefs ?? [])
    .map((r) => normalizeOrderRef(r))
    .filter((k) => k.length >= 2);

  const refToTracking = new Map<string, string>();
  const last4ToTracking = new Map<string, string>();
  const last4Sets = new Map<string, Set<string>>();

  function resolve(): string {
    for (const k of fullKeys) {
      const hit = refToTracking.get(k);
      if (hit) return hit;
    }
    if (last4.length === 4) {
      return last4ToTracking.get(last4) ?? "";
    }
    return "";
  }

  try {
    for (let page = 1; page <= MAX_LIST_PAGES; page++) {
      const { rows } = await fetchShipmentListPage(page);
      if (rows.length === 0) break;

      for (const row of rows) {
        const t = typeof row.tracking === "string" ? row.tracking.trim() : "";
        if (!t) continue;
        indexStringsFromListRow(row, t, refToTracking, last4ToTracking, last4Sets);
      }

      const hit = resolve();
      if (hit) return hit;
    }
  } catch (e) {
    console.warn(
      "[awb] findTrackingFromRecentList failed:",
      e instanceof Error ? e.message : e,
    );
    return "";
  }

  return resolve();
}

/** Convenience: last-4 from a raw order name / number string. */
export function orderLast4(raw: string): string {
  return lastDigits(raw, 4);
}
