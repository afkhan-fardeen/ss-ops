import type { ShopifyOrder } from "@/lib/shopify/types";
import { fetchOrders } from "@/lib/orders/fetch-orders";
import { fetchStore2Orders } from "@/lib/store2/fetch-orders";
import { getBahrainCalendarDay, type BahrainCalendarDay } from "@/lib/datetime/collection-window";
import { STORE_LABELS } from "@/lib/stores/labels";

export type StoreSalesSummary = {
  store: string;
  currency: string;
  orderCount: number;
  unitsSold: number;
  totalSales: number;
  totalDiscounts: number;
};

export type DailySalesReport = {
  day: BahrainCalendarDay;
  stores: StoreSalesSummary[];
};

function summarize(store: string, currency: string, orders: ShopifyOrder[]): StoreSalesSummary {
  const active = orders.filter((o) => !o.cancelled_at);
  const unitsSold = active.reduce(
    (sum, o) => sum + (o.line_items ?? []).reduce((s, li) => s + li.quantity, 0),
    0,
  );
  const totalSales = active.reduce((sum, o) => sum + (Number.parseFloat(o.total_price) || 0), 0);
  const totalDiscounts = active.reduce(
    (sum, o) => sum + (Number.parseFloat(o.total_discounts ?? "0") || 0),
    0,
  );
  return { store, currency, orderCount: active.length, unitsSold, totalSales, totalDiscounts };
}

/**
 * Daily sales summary for both stores over a Bahrain calendar day.
 * `offsetDays`: 0 = today (partial, still in progress), -1 = yesterday (the
 * default for the scheduled report — a full closed day).
 */
export async function loadDailySalesReport(offsetDays = -1): Promise<DailySalesReport> {
  const day = getBahrainCalendarDay(offsetDays);
  const filter = {
    createdAtMinIso: day.startIso,
    createdAtMaxIso: day.endIso,
    cacheStrategy: "prefer-cache" as const,
  };

  const [store1, store2] = await Promise.all([
    fetchOrders(filter).catch(() => ({ orders: [] as ShopifyOrder[] })),
    fetchStore2Orders(filter).catch(() => ({ orders: [] as ShopifyOrder[] })),
  ]);

  const store1Currency = store1.orders[0]?.currency ?? "GBP";
  const store2Currency = store2.orders[0]?.currency ?? "AED";

  return {
    day,
    stores: [
      summarize(STORE_LABELS[1], store1Currency, store1.orders),
      summarize(STORE_LABELS[2], store2Currency, store2.orders),
    ],
  };
}
