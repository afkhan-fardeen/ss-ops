import {
  buildUbexLookup,
  shopifyLast4Set,
  ubexTrackingForShopifyOrder,
} from "@/lib/ubex/build-lookup";
import { fetchSingleOrderByName } from "@/lib/shopify/fetch-single-order";
import {
  getOrderUbexLinkByOrderName,
  upsertOrderUbexLinks,
} from "@/lib/supabase/order-ubex-links";

export type TrackingLookupResult =
  | { ok: true; tracking: string; orderName: string; source: "db" | "live" }
  | { ok: false; error: string; reason: "not_found" | "no_tracking" | "ubex_error" };

/**
 * Resolve a Shopify order name to a UBEX tracking number.
 *
 * Resolution order:
 *  1. Check order_ubex_links in Supabase (fast, no API calls).
 *  2. Fetch the order from Shopify and run a targeted UBEX lookup.
 *  3. Persist the result for future lookups.
 */
export async function lookupOrderTracking(
  rawInput: string,
  storeId: 1 | 2,
): Promise<TrackingLookupResult> {
  const stripped = rawInput.trim().replace(/^#/, "");
  const prefixed = `#${stripped}`;

  // 1. Check DB cache first.
  const cached = await getOrderUbexLinkByOrderName(prefixed, storeId);
  if (cached) {
    return { ok: true, tracking: cached, orderName: prefixed, source: "db" };
  }

  // 2. Fetch the order from Shopify.
  const order =
    (await fetchSingleOrderByName(prefixed, storeId)) ??
    (await fetchSingleOrderByName(stripped, storeId));

  if (!order) {
    return {
      ok: false,
      error: `Order ${prefixed} was not found in Shopify. Check the order number and store.`,
      reason: "not_found",
    };
  }

  const normalizedName = order.name ?? prefixed;

  // 3. Run a targeted UBEX lookup using the order's last-4 digits.
  const needed = shopifyLast4Set([order]);
  const lookup = await buildUbexLookup({ needed, force: false, skipDetailFetches: true });
  const tracking = ubexTrackingForShopifyOrder(order, lookup);

  if (!tracking) {
    return {
      ok: false,
      error: `Order ${normalizedName} exists but has no UBEX shipment yet. It may not have been shipped.`,
      reason: "no_tracking",
    };
  }

  // 4. Persist the match for next time (fire-and-forget — don't block the response).
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
