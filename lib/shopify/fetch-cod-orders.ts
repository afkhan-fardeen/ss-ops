import type { ShopifyOrder } from "./types";

/**
 * Detect COD from gateway strings (varies by store / manual payment naming).
 * Lives in lib/shopify so it can be imported by both the COD list page and the generic
 * order fetcher without a circular dependency.
 */
export function orderLooksLikeCod(o: ShopifyOrder): boolean {
  const tokens = [...(o.payment_gateway_names ?? []), o.gateway ?? ""].filter(
    (t): t is string => typeof t === "string" && t.trim().length > 0,
  );
  const extra = (process.env.SHOPIFY_COD_MATCH_EXTRA ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  for (const e of extra) {
    if (tokens.some((t) => t.toLowerCase().includes(e))) return true;
  }
  return tokens.some((t) => {
    const s = t.toLowerCase().trim();
    if (s.includes("cash_on_delivery")) return true;
    if (s.includes("cash on delivery")) return true;
    if (s.includes("(cod)")) return true;
    if (s === "cod") return true;
    if (/\bcash\b/.test(s) && /\bdeliver(y|ies)\b/.test(s)) return true;
    return false;
  });
}

export function formatShippingAddress(addr: ShopifyOrder["shipping_address"]): string {
  if (!addr) return "";
  const parts = [
    addr.address1,
    addr.address2,
    [addr.city, addr.province].filter(Boolean).join(", "),
    addr.zip,
    addr.country,
  ]
    .filter((p) => p && String(p).trim())
    .map((p) => String(p).trim());
  return parts.join(", ");
}

export type FetchCodOrdersResult = {
  codOrders: ShopifyOrder[];
  ordersScannedInWindow: number;
};

/**
 * Thin wrapper preserved for back-compat; new code should call `fetchOrders` in `lib/orders/fetch-orders.ts`.
 */
export async function fetchCodOrders(params: {
  createdAtMinIso: string;
  createdAtMaxIso: string;
  cacheStrategy?: "prefer-cache" | "live" | "cache-only";
}): Promise<FetchCodOrdersResult> {
  const { fetchOrders } = await import("@/lib/orders/fetch-orders");
  const { orders, ordersScannedInWindow } = await fetchOrders({
    createdAtMinIso: params.createdAtMinIso,
    createdAtMaxIso: params.createdAtMaxIso,
    cod: "only",
    cacheStrategy: params.cacheStrategy,
  });
  return { codOrders: orders, ordersScannedInWindow };
}
