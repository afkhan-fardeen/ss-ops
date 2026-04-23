import { getCurrencyForCountry } from "@/lib/currency";
import { formatMoneyGbp } from "@/lib/utils";
import type { ShopifyOrder } from "@/lib/shopify/types";
import { formatShippingAddress } from "@/lib/shopify/fetch-cod-orders";
import { ubexTrackingForShopifyOrder, type UbexLookup } from "@/lib/ubex/build-lookup";
import { resolveTrackingUrl } from "@/lib/ubex/tracking-url";

export type CodRow = {
  orderId: number;
  orderName: string;
  orderDate: string | null;
  ubexId: string;
  trackingUrl: string;
  paymentMethod: string;
  outstandingGbp: string;
  toCollect: string;
  customerName: string;
  shippingAddress: string;
  shippingCountry: string;
  currencyWarning?: string;
  alreadyFulfilled: boolean;
};

export function buildCodRows(
  orders: ShopifyOrder[],
  rates: Record<string, number>,
  ubexLookup?: UbexLookup | Map<string, string>,
): CodRow[] {
  return orders.map((o) => {
    const currencyResult = getCurrencyForCountry(o.shipping_address?.country_code);
    let toCollect = "—";
    let currencyWarning: string | undefined;

    if (currencyResult.currency) {
      const rate = rates[currencyResult.currency];
      const gbp = Number.parseFloat(o.total_price);
      if (typeof rate === "number" && !Number.isNaN(gbp)) {
        const foreign = Math.round(gbp * rate);
        toCollect = `${foreign} ${currencyResult.currency}`;
      } else {
        toCollect = "—";
        currencyWarning = `No rate for ${currencyResult.currency}`;
      }
    } else {
      currencyWarning = "Unknown country / currency";
    }

    const first = o.customer?.first_name?.trim() ?? "";
    const last = o.customer?.last_name?.trim() ?? "";
    const customerName = [first, last].filter(Boolean).join(" ") || "—";

    const hasLookup =
      ubexLookup instanceof Map ? ubexLookup.size > 0 : !!ubexLookup && ubexLookup.refToTracking.size > 0;
    const ubexId = hasLookup && ubexLookup ? ubexTrackingForShopifyOrder(o, ubexLookup) : "";
    // Prefer Ubex's tracking_url only when it actually embeds the tracking id; otherwise build from template.
    const urlFromLookup =
      ubexId && ubexLookup && !(ubexLookup instanceof Map)
        ? ubexLookup.trackingUrls.get(ubexId) ?? ""
        : "";
    const trackingUrl = resolveTrackingUrl(ubexId, urlFromLookup);

    return {
      orderId: o.id,
      orderName: o.name,
      orderDate: o.created_at ?? null,
      ubexId,
      trackingUrl,
      paymentMethod: "Cash on Delivery (COD)",
      outstandingGbp: formatMoneyGbp(o.total_price),
      toCollect,
      customerName,
      shippingAddress: formatShippingAddress(o.shipping_address) || "—",
      shippingCountry: (o.shipping_address?.country_code ?? "—").toUpperCase(),
      currencyWarning,
      alreadyFulfilled: (o.fulfillment_status ?? "").toLowerCase() === "fulfilled",
    };
  });
}
