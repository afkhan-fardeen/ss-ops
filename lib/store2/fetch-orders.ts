/** Fetch Shopify orders for Store 2.
 *  Mirrors lib/orders/fetch-orders.ts but uses Store 2 credentials
 *  and the shopify_orders_cache_s2 table. */

import type { ShopifyOrder, ShopifyOrdersResponse } from "@/lib/shopify/types";
import { orderLooksLikeCod } from "@/lib/shopify/fetch-cod-orders";
import { getSupabaseService } from "@/lib/supabase/service";
import { shopifyOrderToCacheRow, cacheRowToShopifyOrder } from "@/lib/supabase/orders-cache";
import type { ShopifyOrderCacheRow } from "@/lib/supabase/types";
import { getStore2Env } from "./client";
import type { OrdersFilter, FetchOrdersResult } from "@/lib/orders/fetch-orders";

const FIELDS =
  "id,name,order_number,customer,shipping_address,total_price,currency,financial_status,fulfillment_status,gateway,payment_gateway_names,created_at";

async function fetchFromStore2(filter: OrdersFilter): Promise<ShopifyOrder[]> {
  const { domain, token, version } = getStore2Env();
  const all: ShopifyOrder[] = [];
  let sinceId: string | undefined;

  for (;;) {
    const sp = new URLSearchParams({
      status: "any",
      created_at_min: filter.createdAtMinIso,
      created_at_max: filter.createdAtMaxIso,
      limit: "250",
      fields: FIELDS,
    });
    if (filter.fulfillmentStatus && filter.fulfillmentStatus !== "any") {
      sp.set("fulfillment_status", filter.fulfillmentStatus);
    }
    if (filter.financialStatus && filter.financialStatus !== "any") {
      sp.set("financial_status", filter.financialStatus);
    }
    if (sinceId) sp.set("since_id", sinceId);

    const url = `https://${domain}/admin/api/${version}/orders.json?${sp.toString()}`;
    const res = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Store2 Shopify API ${res.status}: ${text.slice(0, 500)}`);
    }
    const data = (await res.json()) as ShopifyOrdersResponse;
    const page = data.orders ?? [];
    all.push(...page);
    if (page.length < 250) break;
    const maxId = Math.max(...page.map((o) => o.id));
    sinceId = String(maxId);
  }

  return all;
}

async function isS2CacheFresh(windowMinIso: string, maxAgeSeconds: number): Promise<boolean> {
  const supabase = getSupabaseService();
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("shopify_orders_cache_s2")
    .select("last_synced_at")
    .gte("created_at", windowMinIso)
    .order("last_synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return false;
  const age = Date.now() - new Date((data as { last_synced_at: string }).last_synced_at).getTime();
  return age < maxAgeSeconds * 1000;
}

async function readS2OrdersFromCache(filter: {
  createdAtMinIso: string;
  createdAtMaxIso: string;
  fulfillmentStatus?: "any" | "unfulfilled";
  cod?: "any" | "only" | "exclude";
}): Promise<{ orders: ShopifyOrder[]; ordersScannedInWindow: number } | null> {
  const supabase = getSupabaseService();
  if (!supabase) return null;

  let query = supabase
    .from("shopify_orders_cache_s2")
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

async function upsertS2OrdersCache(orders: Array<ShopifyOrder & { created_at?: string | null }>): Promise<void> {
  const supabase = getSupabaseService();
  if (!supabase || orders.length === 0) return;
  const rows = orders.map((o) => ({
    ...shopifyOrderToCacheRow(o),
    last_synced_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("shopify_orders_cache_s2").upsert(rows, { onConflict: "id" });
  if (error) console.warn("[s2-orders-cache] bulk upsert failed:", error.message);
}

/** Upsert a single Store 2 order into shopify_orders_cache_s2. Called from webhooks. */
export async function upsertS2OrderCache(order: ShopifyOrder & { created_at?: string | null }): Promise<void> {
  const supabase = getSupabaseService();
  if (!supabase) return;
  const row = {
    ...shopifyOrderToCacheRow(order),
    last_synced_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("shopify_orders_cache_s2").upsert(row, { onConflict: "id" });
  if (error) console.warn("[s2-orders-cache] upsert failed:", error.message);
}

/**
 * Fetch Store 2 orders. Prefers the Supabase cache (shopify_orders_cache_s2)
 * when fresh and falls back to the Shopify Admin API.
 */
export async function fetchStore2Orders(filter: OrdersFilter): Promise<FetchOrdersResult> {
  const strategy = filter.cacheStrategy ?? "prefer-cache";
  const maxAge = filter.maxCacheAgeSeconds ?? 300;

  const cacheFilter = {
    createdAtMinIso: filter.createdAtMinIso,
    createdAtMaxIso: filter.createdAtMaxIso,
    fulfillmentStatus: filter.fulfillmentStatus === "unfulfilled" ? "unfulfilled" : "any",
    cod: filter.cod,
  } as const;

  if (strategy !== "live") {
    const fresh =
      strategy === "cache-only"
        ? true
        : await isS2CacheFresh(filter.createdAtMinIso, maxAge).catch(() => false);
    if (fresh) {
      const cached = await readS2OrdersFromCache(cacheFilter).catch(() => null);
      if (cached) {
        return { orders: cached.orders, ordersScannedInWindow: cached.ordersScannedInWindow, source: "cache" };
      }
    }
    if (strategy === "cache-only") {
      return { orders: [], ordersScannedInWindow: 0, source: "cache" };
    }
  }

  const all = await fetchFromStore2(filter);
  const ordersScannedInWindow = all.length;

  void upsertS2OrdersCache(all).catch((e) => console.warn("[s2-orders-cache] background upsert:", e));

  let orders = all;
  if (filter.cod === "only") orders = all.filter(orderLooksLikeCod);
  else if (filter.cod === "exclude") orders = all.filter((o) => !orderLooksLikeCod(o));

  return { orders, ordersScannedInWindow, source: "shopify" };
}
