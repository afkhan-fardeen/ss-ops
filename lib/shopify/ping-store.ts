/** Lightweight Shopify connectivity checks used by the store connection status indicator. */

export type StoreConnectionStatus = {
  configured: boolean;
  ok: boolean;
  shopName?: string;
  domain?: string;
  error?: string;
  latencyMs?: number;
};

async function pingShopify(
  domain: string,
  token: string,
  version: string,
): Promise<StoreConnectionStatus> {
  const start = Date.now();
  try {
    const res = await fetch(`https://${domain}/admin/api/${version}/shop.json`, {
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { configured: true, ok: false, domain, latencyMs, error: `HTTP ${res.status}: ${text.slice(0, 120)}` };
    }
    const data = (await res.json()) as { shop?: { name?: string } };
    return { configured: true, ok: true, domain, latencyMs, shopName: data.shop?.name };
  } catch (e) {
    return {
      configured: true,
      ok: false,
      domain,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Ping Store 1 (main store). */
export async function pingStore1(): Promise<StoreConnectionStatus> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const version = process.env.SHOPIFY_API_VERSION ?? "2024-01";
  if (!domain || !token) {
    return { configured: false, ok: false, error: "SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN not set" };
  }
  return pingShopify(domain, token, version);
}

/** Ping Store 2. Returns configured=false immediately if env vars are absent. */
export async function pingStore2(): Promise<StoreConnectionStatus> {
  const domain = process.env.SHOPIFY_STORE2_DOMAIN;
  const token = process.env.SHOPIFY_STORE2_ACCESS_TOKEN;
  const version = process.env.SHOPIFY_STORE2_API_VERSION ?? "2024-01";
  if (!domain || !token) {
    return { configured: false, ok: false };
  }
  return pingShopify(domain, token, version);
}

/** Ping both stores in parallel. */
export async function pingBothStores(): Promise<{
  store1: StoreConnectionStatus;
  store2: StoreConnectionStatus;
}> {
  const [store1, store2] = await Promise.all([pingStore1(), pingStore2()]);
  return { store1, store2 };
}
