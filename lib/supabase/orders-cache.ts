import type { ShopifyOrder } from "@/lib/shopify/types";
import { orderLooksLikeCod } from "@/lib/shopify/fetch-cod-orders";
import { getSupabaseService } from "./service";
import type { ShopifyOrderCacheRow } from "./types";

/** Flatten a Shopify order payload to the shopify_orders_cache row shape. */
export function shopifyOrderToCacheRow(
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
export function cacheRowToShopifyOrder(row: ShopifyOrderCacheRow): ShopifyOrder {
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

/** Read cached orders. Returns `null` (not empty) when Supabase is not configured so the caller can fall back. */
export async function readOrdersFromCache(
  filter: OrdersCacheFilter,
): Promise<{ orders: ShopifyOrder[]; ordersScannedInWindow: number } | null> {
  const supabase = getSupabaseService();
  if (!supabase) return null;

  let query = supabase
    .from("shopify_orders_cache")
    .select("*")
    .gte("created_at", filter.createdAtMinIso)
    .lt("created_at", filter.createdAtMaxIso);

  if (filter.fulfillmentStatus === "unfulfilled") {
    query = query.or("fulfillment_status.is.null,fulfillment_status.neq.fulfilled");
  }
  if (filter.cod === "only") query = query.eq("is_cod", true);
  else if (filter.cod === "exclude") query = query.eq("is_cod", false);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error || !data) return null;

  const orders = (data as ShopifyOrderCacheRow[]).map(cacheRowToShopifyOrder);
  return { orders, ordersScannedInWindow: orders.length };
}

export async function upsertOrderCache(order: ShopifyOrder & { created_at?: string | null }): Promise<void> {
  const supabase = getSupabaseService();
  if (!supabase) return;
  const row = {
    ...shopifyOrderToCacheRow(order),
    last_synced_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("shopify_orders_cache").upsert(row, { onConflict: "id" });
  if (error) console.warn("[orders-cache] upsert failed:", error.message);
}

export async function upsertOrdersCache(
  orders: Array<ShopifyOrder & { created_at?: string | null }>,
): Promise<void> {
  const supabase = getSupabaseService();
  if (!supabase || orders.length === 0) return;
  const rows = orders.map((o) => ({
    ...shopifyOrderToCacheRow(o),
    last_synced_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("shopify_orders_cache").upsert(rows, { onConflict: "id" });
  if (error) console.warn("[orders-cache] bulk upsert failed:", error.message);
}

/** Delete a single cached order (orders/cancelled webhook). */
export async function deleteOrderCache(orderId: number): Promise<void> {
  const supabase = getSupabaseService();
  if (!supabase) return;
  const { error } = await supabase.from("shopify_orders_cache").delete().eq("id", orderId);
  if (error) console.warn("[orders-cache] delete failed:", error.message);
}

/** Freshness check: is the cache younger than `maxAgeSeconds`? */
export async function isOrdersCacheFresh(
  windowMinIso: string,
  maxAgeSeconds: number,
): Promise<boolean> {
  const supabase = getSupabaseService();
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("shopify_orders_cache")
    .select("last_synced_at")
    .gte("created_at", windowMinIso)
    .order("last_synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return false;
  const age = Date.now() - new Date(data.last_synced_at).getTime();
  return age < maxAgeSeconds * 1000;
}
