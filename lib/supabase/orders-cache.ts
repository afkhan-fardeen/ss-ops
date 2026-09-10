import type { ShopifyOrder } from "@/lib/shopify/types";
import { orderLooksLikeCod } from "@/lib/shopify/fetch-cod-orders";
import { getSupabaseService } from "./service";
import type { ShopifyOrderCacheRow } from "./types";

/** Flatten a Shopify order payload to the shopify_orders_cache row shape. */
function shopifyOrderToCacheRow(
  o: ShopifyOrder & { created_at?: string | null },
): Omit<ShopifyOrderCacheRow, "last_synced_at"> {
  return {
    id: o.id,
    name: o.name,
    order_number: o.order_number ?? null,
    created_at: o.created_at ?? null,
    financial_status: o.financial_status ?? null,
    fulfillment_status: o.fulfillment_status ?? null,
    gateway: o.gateway ?? null,
    payment_gateway_names: o.payment_gateway_names ?? null,
    total_price: o.total_price ?? null,
    currency: o.currency ?? null,
    country_code: o.shipping_address?.country_code ?? null,
    customer: (o.customer as unknown) ?? null,
    shipping_address: (o.shipping_address as unknown) ?? null,
    is_cod: orderLooksLikeCod(o),
    raw: o as unknown,
  };
}

/** Round-trip a cache row back to the in-app ShopifyOrder shape. */
function cacheRowToShopifyOrder(row: ShopifyOrderCacheRow): ShopifyOrder {
  if (row.raw && typeof row.raw === "object") {
    return row.raw as ShopifyOrder;
  }
  // Minimal reconstruction if `raw` wasn't stored for some reason.
  return {
    id: row.id,
    name: row.name,
    order_number: row.order_number ?? undefined,
    total_price: String(row.total_price ?? "0"),
    currency: row.currency ?? "GBP",
    financial_status: row.financial_status,
    gateway: row.gateway,
    payment_gateway_names: row.payment_gateway_names ?? undefined,
    fulfillment_status: row.fulfillment_status,
    customer: (row.customer as ShopifyOrder["customer"]) ?? null,
    shipping_address: (row.shipping_address as ShopifyOrder["shipping_address"]) ?? null,
  };
}

export type OrdersCacheFilter = {
  createdAtMinIso: string;
  createdAtMaxIso: string;
  fulfillmentStatus?: "any" | "unfulfilled";
  cod?: "any" | "only" | "exclude";
};

export type OrdersCacheTable = "shopify_orders_cache" | "shopify_orders_cache_s2";

/** Read cached orders. Returns `null` (not empty) when Supabase is not configured so the caller can fall back. */
export async function readOrdersFromCache(
  filter: OrdersCacheFilter,
  table: OrdersCacheTable = "shopify_orders_cache",
): Promise<{ orders: ShopifyOrder[]; ordersScannedInWindow: number } | null> {
  const supabase = getSupabaseService();
  if (!supabase) return null;

  let query = supabase
    .from(table)
    .select("*")
    .gte("created_at", filter.createdAtMinIso)
    .lt("created_at", filter.createdAtMaxIso);

  if (filter.fulfillmentStatus === "unfulfilled") {
    query = query.or("fulfillment_status.is.null,fulfillment_status.neq.fulfilled");
  }
  if (filter.cod === "only") query = query.eq("is_cod", true);
  else if (filter.cod === "exclude") query = query.eq("is_cod", false);

  // Safety valve: a date range large enough to pull an unbounded number of full
  // (raw JSON included) rows should fail loud via the caller's Shopify fallback
  // rather than pull an unbounded payload into memory.
  const CACHE_ROW_CAP = 10_000;
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(CACHE_ROW_CAP + 1);
  if (error || !data) return null;
  if (data.length > CACHE_ROW_CAP) {
    console.warn(`[orders-cache:${table}] window exceeds ${CACHE_ROW_CAP} rows; forcing live fallback`);
    return null;
  }

  const orders = (data as ShopifyOrderCacheRow[]).map(cacheRowToShopifyOrder);
  return { orders, ordersScannedInWindow: orders.length };
}

export async function upsertOrderCache(
  order: ShopifyOrder & { created_at?: string | null },
  table: OrdersCacheTable = "shopify_orders_cache",
): Promise<void> {
  const supabase = getSupabaseService();
  if (!supabase) return;
  const row = {
    ...shopifyOrderToCacheRow(order),
    last_synced_at: new Date().toISOString(),
  };
  const { error } = await supabase.from(table).upsert(row, { onConflict: "id" });
  if (error) console.warn(`[orders-cache:${table}] upsert failed:`, error.message);
}

export async function upsertOrdersCache(
  orders: Array<ShopifyOrder & { created_at?: string | null }>,
  table: OrdersCacheTable = "shopify_orders_cache",
): Promise<void> {
  const supabase = getSupabaseService();
  if (!supabase || orders.length === 0) return;
  const rows = orders.map((o) => ({
    ...shopifyOrderToCacheRow(o),
    last_synced_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
  if (error) console.warn(`[orders-cache:${table}] bulk upsert failed:`, error.message);
}

/** Delete a single cached order (orders/cancelled webhook). */
export async function deleteOrderCache(
  orderId: number,
  table: OrdersCacheTable = "shopify_orders_cache",
): Promise<void> {
  const supabase = getSupabaseService();
  if (!supabase) return;
  const { error } = await supabase.from(table).delete().eq("id", orderId);
  if (error) console.warn(`[orders-cache:${table}] delete failed:`, error.message);
}

/** Freshness check: is the cache younger than `maxAgeSeconds`? */
export async function isOrdersCacheFresh(
  windowMinIso: string,
  maxAgeSeconds: number,
  table: OrdersCacheTable = "shopify_orders_cache",
): Promise<boolean> {
  const supabase = getSupabaseService();
  if (!supabase) return false;
  const { data, error } = await supabase
    .from(table)
    .select("last_synced_at")
    .gte("created_at", windowMinIso)
    .order("last_synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return false;
  const age = Date.now() - new Date(data.last_synced_at).getTime();
  return age < maxAgeSeconds * 1000;
}
