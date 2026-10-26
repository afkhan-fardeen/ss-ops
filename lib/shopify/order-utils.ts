import type { ShopifyOrder } from "./types";

/** Detect Cash-on-Delivery orders from gateway strings (naming varies by store / manual payment). */
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
