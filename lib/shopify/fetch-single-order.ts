import type { ShopifyOrder } from "@/lib/shopify/types";

function getStore1Env() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const version = process.env.SHOPIFY_API_VERSION ?? "2024-01";
  if (!domain || !token) return null;
  return { domain, token, version };
}

function getStore2Env() {
  const domain = process.env.SHOPIFY_STORE2_DOMAIN;
  const token = process.env.SHOPIFY_STORE2_ACCESS_TOKEN;
  const version = process.env.SHOPIFY_STORE2_API_VERSION ?? "2024-01";
  if (!domain || !token) return null;
  return { domain, token, version };
}

async function shopifyFetch(
  domain: string,
  token: string,
  version: string,
  path: string,
): Promise<Response> {
  const url = `https://${domain}/admin/api/${version}${path}`;
  return fetch(url, {
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    cache: "no-store",
  });
}

/**
 * Fetch a single Shopify order by name (e.g. "#1234" or "1234") for the given store.
 * Returns null if the order is not found or the store is not configured.
 */
export async function fetchSingleOrderByName(
  orderName: string,
  storeId: 1 | 2,
): Promise<ShopifyOrder | null> {
  const env = storeId === 1 ? getStore1Env() : getStore2Env();
  if (!env) return null;

  const { domain, token, version } = env;
  const encodedName = encodeURIComponent(orderName);
  const path = `/orders.json?name=${encodedName}&status=any&limit=1`;

  let res: Response;
  try {
    res = await shopifyFetch(domain, token, version, path);
  } catch {
    return null;
  }

  if (!res.ok) return null;

  const body = (await res.json()) as { orders?: ShopifyOrder[] };
  return body.orders?.[0] ?? null;
}
