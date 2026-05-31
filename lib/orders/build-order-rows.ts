import { formatMoneyGbp } from "@/lib/utils";
import type { ShopifyOrder } from "@/lib/shopify/types";
import { formatShippingAddress, orderLooksLikeCod } from "@/lib/shopify/fetch-cod-orders";
import { ubexTrackingForShopifyOrder, type UbexLookup } from "@/lib/ubex/build-lookup";
import { lookupHasEntries } from "@/lib/ubex/merge-lookup";
import { resolveTrackingUrl } from "@/lib/ubex/tracking-url";

export type OrderRow = {
  orderId: number;
  orderName: string;
  orderDate: string | null;
  ubexId: string;
  trackingUrl: string;
  isCod: boolean;
  paymentLabel: string;
  totalGbp: string;
  customerName: string;
  shippingAddress: string;
  shippingCountry: string;
  fulfillmentStatus: "fulfilled" | "partial" | "unfulfilled" | "unknown";
  financialStatus: string;
  alreadyFulfilled: boolean;
};

function normalizeFulfillmentStatus(raw: string | null | undefined): OrderRow["fulfillmentStatus"] {
  const v = (raw ?? "").toLowerCase();
  if (v === "fulfilled") return "fulfilled";
  if (v === "partial") return "partial";
  if (!v || v === "null" || v === "unfulfilled") return "unfulfilled";
  return "unknown";
}

/** Generic per-row builder used by /fulfillment (no FX, no COD currency). */
export function buildOrderRows(
  orders: ShopifyOrder[],
  ubexLookup?: UbexLookup | Map<string, string>,
): OrderRow[] {
  return orders.map((o) => {
    const first = o.customer?.first_name?.trim() ?? "";
    const last = o.customer?.last_name?.trim() ?? "";
    const customerName = [first, last].filter(Boolean).join(" ") || "—";

    const hasLookup = lookupHasEntries(ubexLookup);
    const ubexId = hasLookup && ubexLookup ? ubexTrackingForShopifyOrder(o, ubexLookup) : "";
    const urlFromLookup =
      ubexId && ubexLookup && !(ubexLookup instanceof Map)
        ? ubexLookup.trackingUrls.get(ubexId) ?? ""
        : "";
    const trackingUrl = resolveTrackingUrl(ubexId, urlFromLookup);

    const cod = orderLooksLikeCod(o);
    const paymentLabel = cod ? "Cash on Delivery" : prettyPayment(o);

    return {
      orderId: o.id,
      orderName: o.name,
      orderDate: o.created_at ?? null,
      ubexId,
      trackingUrl,
      isCod: cod,
      paymentLabel,
      totalGbp: formatMoneyGbp(o.total_price),
      customerName,
      shippingAddress: formatShippingAddress(o.shipping_address) || "—",
      shippingCountry: (o.shipping_address?.country_code ?? "—").toUpperCase(),
      fulfillmentStatus: normalizeFulfillmentStatus(o.fulfillment_status),
      financialStatus: (o.financial_status ?? "").toLowerCase() || "unknown",
      alreadyFulfilled: (o.fulfillment_status ?? "").toLowerCase() === "fulfilled",
    };
  });
}

function prettyPayment(o: ShopifyOrder): string {
  const names = (o.payment_gateway_names ?? []).filter(Boolean);
  if (names.length > 0) return names.join(", ");
  if (o.gateway) return o.gateway;
  return "—";
}
