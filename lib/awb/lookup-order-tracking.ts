import { fetchSingleOrderByName } from "@/lib/shopify/fetch-single-order";
import {
  getOrderUbexLinkByOrderName,
  upsertOrderUbexLinks,
} from "@/lib/supabase/order-ubex-links";
import { getUniqueUbexCacheByLast4 } from "@/lib/supabase/ubex-cache";
import {
  findTrackingFromRecentList,
  orderLast4,
} from "@/lib/ubex/find-tracking-for-order";

export type TrackingLookupResult =
  | { ok: true; tracking: string; orderName: string; source: "db" | "live" }
  | { ok: false; error: string; reason: "not_found" | "no_tracking" | "ubex_error" };

/**
 * Resolve a Shopify order name to a UBEX tracking number — fast path for AWB search.
 *
 * Resolution order (never calls buildUbexLookup):
 *  1. order_ubex_links (exact name)
 *  2. ubex_cache unique last-4
 *  3. Ubex list pages 1–2 only (full-ref then unique last-4)
 *  4. Persist match for next time
 */
export async function lookupOrderTracking(
  rawInput: string,
  storeId: 1 | 2,
): Promise<TrackingLookupResult> {
  const stripped = rawInput.trim().replace(/^#/, "");
  const prefixed = `#${stripped}`;

  // Kick off DB link + Shopify in parallel; return as soon as the link hits.
  const linkPromise = getOrderUbexLinkByOrderName(prefixed, storeId);
  const shopifyPromise = (async () =>
    (await fetchSingleOrderByName(prefixed, storeId)) ??
    (await fetchSingleOrderByName(stripped, storeId)))();

  const cached = await linkPromise;
  if (cached) {
    return { ok: true, tracking: cached, orderName: prefixed, source: "db" };
  }

  const order = await shopifyPromise;
  if (!order) {
    return {
      ok: false,
      error: `Order ${prefixed} was not found in Shopify. Check the order number and store.`,
      reason: "not_found",
    };
  }

  const normalizedName = order.name ?? prefixed;
  const l4 = orderLast4(normalizedName) || orderLast4(stripped);
  const fullRefs = [
    normalizedName,
    stripped,
    order.order_number != null ? String(order.order_number) : "",
    order.order_number != null ? `#${order.order_number}` : "",
    String(order.id),
  ].filter(Boolean);

  // 2. Targeted ubex_cache by unique last-4 (indexed).
  if (l4.length === 4) {
    const byLast4 = await getUniqueUbexCacheByLast4([l4]);
    const hit = byLast4.get(l4);
    if (hit?.tracking) {
      void upsertOrderUbexLinks(
        [
          {
            shopifyOrderId: order.id,
            shopifyOrderName: normalizedName,
            ubexTracking: hit.tracking,
          },
        ],
        { storeId },
      ).catch((e) => console.warn("[awb] upsertOrderUbexLinks failed:", e));

      return { ok: true, tracking: hit.tracking, orderName: normalizedName, source: "db" };
    }
  }

  // 3. Live Ubex: at most 2 list pages, no detail fanout.
  const tracking = await findTrackingFromRecentList({ last4: l4, fullRefs });
  if (!tracking) {
    return {
      ok: false,
      error: `Order ${normalizedName} exists but has no UBEX shipment yet. It may not have been shipped.`,
      reason: "no_tracking",
    };
  }

  void upsertOrderUbexLinks(
    [
      {
        shopifyOrderId: order.id,
        shopifyOrderName: normalizedName,
        ubexTracking: tracking,
      },
    ],
    { storeId },
  ).catch((e) => console.warn("[awb] upsertOrderUbexLinks failed:", e));

  return { ok: true, tracking, orderName: normalizedName, source: "live" };
}
