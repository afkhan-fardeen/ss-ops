/** Fetch Shopify orders for Store 2.
 *  Thin wrapper around lib/orders/fetch-orders.ts's shared fetcher, using
 *  Store 2 credentials and the shopify_orders_cache_s2 table. */

import { fetchOrdersForStore, type OrdersFilter, type FetchOrdersResult } from "@/lib/orders/fetch-orders";
import { getStore2Env } from "./client";

/**
 * Fetch Store 2 orders. Prefers the Supabase cache (shopify_orders_cache_s2)
 * when fresh and falls back to the Shopify Admin API.
 */
export async function fetchStore2Orders(filter: OrdersFilter): Promise<FetchOrdersResult> {
  return fetchOrdersForStore(getStore2Env(), "shopify_orders_cache_s2", 2, filter);
}
