import type { ShopifyOrder, ShopifyOrdersResponse } from "@/lib/shopify/types";
import { orderLooksLikeCod } from "@/lib/shopify/fetch-cod-orders";
import { isOrdersCacheFresh, readOrdersFromCache, upsertOrdersCache } from "@/lib/supabase/orders-cache";

function getEnv(): { domain: string; token: string; version: string } {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const version = process.env.SHOPIFY_API_VERSION ?? "2024-01";
  if (!domain || !token) {
    throw new Error("Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN");
  }
  return { domain, token, version };
}

const FIELDS =
  "id,name,order_number,customer,shipping_address,total_price,currency,financial_status,fulfillment_status,gateway,payment_gateway_names,created_at";

export type OrdersFilter = {
  createdAtMinIso: string;
  createdAtMaxIso: string;
  /** Shopify-side fulfillment filter. Use "unfulfilled" on the Fulfillment queue. */
  fulfillmentStatus?: "any" | "unfulfilled" | "shipped" | "partial" | "unshipped";
  /** Shopify-side financial filter. */
  financialStatus?: "any" | "pending" | "paid" | "authorized" | "partially_paid";
  /** Client-side COD filter. Default "any". */
  cod?: "any" | "only" | "exclude";
  /**
   * Cache strategy. Default "prefer-cache":
   *   - "prefer-cache": serve from Supabase when the cache is fresh (webhooks keep it current).
   *   - "live": bypass cache, hit Shopify.
   *   - "cache-only": read-only from Supabase (returns empty if cache is cold).
   */
  cacheStrategy?: "prefer-cache" | "live" | "cache-only";
  /** Max age for "prefer-cache" to consider the cache usable. Default 300 s (5 min). */
  maxCacheAgeSeconds?: number;
};

export type FetchOrdersResult = {
  orders: ShopifyOrder[];
  /** Before the client-side COD filter. Useful for UX ("N orders scanned"). */
  ordersScannedInWindow: number;
  /** Where the data came from. */
  source: "cache" | "shopify";
};

async function fetchFromShopify(filter: OrdersFilter): Promise<ShopifyOrder[]> {
  const { domain, token, version } = getEnv();
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
      throw new Error(`Shopify API ${res.status}: ${text.slice(0, 500)}`);
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

/**
 * Generalised Shopify order fetcher used by both /cod-list and /fulfillment. Consults the Supabase
 * `shopify_orders_cache` when fresh (Phase D) and falls back to the Shopify Admin API otherwise.
 */
export async function fetchOrders(filter: OrdersFilter): Promise<FetchOrdersResult> {
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
        : await isOrdersCacheFresh(filter.createdAtMinIso, maxAge).catch(() => false);
    if (fresh) {
      const cached = await readOrdersFromCache(cacheFilter).catch(() => null);
      if (cached) {
        return { orders: cached.orders, ordersScannedInWindow: cached.ordersScannedInWindow, source: "cache" };
      }
    }
    if (strategy === "cache-only") {
      return { orders: [], ordersScannedInWindow: 0, source: "cache" };
    }
  }

  const all = await fetchFromShopify(filter);
  const ordersScannedInWindow = all.length;

  // Persist in background so the next request is cache-fast.
  void upsertOrdersCache(all).catch((e) => console.warn("[orders-cache] background upsert:", e));

  let orders = all;
  if (filter.cod === "only") orders = all.filter(orderLooksLikeCod);
  else if (filter.cod === "exclude") orders = all.filter((o) => !orderLooksLikeCod(o));

  return { orders, ordersScannedInWindow, source: "shopify" };
}
