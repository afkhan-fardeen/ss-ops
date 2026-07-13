/** Store 2 Shopify credentials + REST fetcher. Mirrors the inline helpers in
 *  lib/shopify/fulfill-order.ts and lib/orders/fetch-orders.ts but reads
 *  SHOPIFY_STORE2_* env vars instead. */

export type Store2Env = {
  domain: string;
  token: string;
  version: string;
  company: string;
  notifyCustomer: boolean;
};

export function getStore2Env(): Store2Env {
  const domain = process.env.SHOPIFY_STORE2_DOMAIN;
  const token = process.env.SHOPIFY_STORE2_ACCESS_TOKEN;
  if (!domain || !token) throw new Error("Store 2 not configured (SHOPIFY_STORE2_DOMAIN / SHOPIFY_STORE2_ACCESS_TOKEN missing)");
  return {
    domain,
    token,
    version: process.env.SHOPIFY_STORE2_API_VERSION ?? "2024-01",
    company: (process.env.SHOPIFY_STORE2_TRACKING_COMPANY ?? "Other").trim() || "Other",
    notifyCustomer: (process.env.SHOPIFY_STORE2_NOTIFY_CUSTOMER ?? "true").toLowerCase() === "true",
  };
}

export function isStore2Configured(): boolean {
  return Boolean(process.env.SHOPIFY_STORE2_DOMAIN && process.env.SHOPIFY_STORE2_ACCESS_TOKEN);
}

export async function store2Fetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { domain, token, version } = getStore2Env();
  const url = `https://${domain}/admin/api/${version}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Store2 Shopify ${res.status}: ${text.slice(0, 500)}`);
  }
  return (await res.json()) as T;
}
