import type { ShopifyOrder } from "@/lib/shopify/types";
import { fetchOrders } from "@/lib/orders/fetch-orders";
import { fetchStore2Orders } from "@/lib/store2/fetch-orders";
import {
  bahrainDateKeyForInstant,
  getBahrainCalendarDay,
  shortBahrainDayLabel,
  type BahrainCalendarDay,
} from "@/lib/datetime/collection-window";
import { STORE_LABELS } from "@/lib/stores/labels";

export type SalesOrderRow = {
  orderName: string;
  createdAt: string | null;
  amount: number;
  discount: number;
};

export type TopProduct = {
  name: string;
  unitsSold: number;
  salesAmount: number;
};

export type StoreSalesSummary = {
  store: string;
  currency: string;
  orderCount: number;
  unitsSold: number;
  totalSales: number;
  totalDiscounts: number;
  orders: SalesOrderRow[];
  topProducts: TopProduct[];
};

export type DailySalesReport = {
  day: BahrainCalendarDay;
  stores: StoreSalesSummary[];
};

function lineItemLabel(li: { title: string; variant_title?: string | null }): string {
  return li.variant_title ? `${li.title} - ${li.variant_title}` : li.title;
}

function summarize(store: string, currency: string, orders: ShopifyOrder[]): StoreSalesSummary {
  const active = orders.filter((o) => !o.cancelled_at);

  const products = new Map<string, TopProduct>();
  let unitsSold = 0;
  for (const o of active) {
    for (const li of o.line_items ?? []) {
      unitsSold += li.quantity;
      const key = lineItemLabel(li);
      const price = Number.parseFloat(li.price ?? "0") || 0;
      const existing = products.get(key);
      if (existing) {
        existing.unitsSold += li.quantity;
        existing.salesAmount += price * li.quantity;
      } else {
        products.set(key, { name: key, unitsSold: li.quantity, salesAmount: price * li.quantity });
      }
    }
  }
  const topProducts = [...products.values()].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 5);

  const orderRows: SalesOrderRow[] = active
    .map((o) => ({
      orderName: o.name,
      createdAt: o.created_at ?? null,
      amount: Number.parseFloat(o.total_price) || 0,
      discount: Number.parseFloat(o.total_discounts ?? "0") || 0,
    }))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  const totalSales = orderRows.reduce((sum, r) => sum + r.amount, 0);
  const totalDiscounts = orderRows.reduce((sum, r) => sum + r.discount, 0);

  return {
    store,
    currency,
    orderCount: active.length,
    unitsSold,
    totalSales,
    totalDiscounts,
    orders: orderRows,
    topProducts,
  };
}

/** Daily sales summary (with order breakdown + top products) for both stores over a Bahrain calendar day. */
export async function loadDailySalesReport(day: BahrainCalendarDay): Promise<DailySalesReport> {
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

export type SalesHistoryDay = {
  dateKey: string;
  label: string;
  stores: { store: string; currency: string; orderCount: number; totalSales: number }[];
};

/** Last `days` full (closed) Bahrain calendar days of sales, oldest first — for trend charts. */
export async function loadSalesHistory(days = 14): Promise<SalesHistoryDay[]> {
  const dayPoints = Array.from({ length: days }, (_, i) => getBahrainCalendarDay(-(days - i)));
  const filter = {
    createdAtMinIso: dayPoints[0]!.startIso,
    createdAtMaxIso: dayPoints[dayPoints.length - 1]!.endIso,
    cacheStrategy: "prefer-cache" as const,
  };

  const [store1, store2] = await Promise.all([
    fetchOrders(filter).catch(() => ({ orders: [] as ShopifyOrder[] })),
    fetchStore2Orders(filter).catch(() => ({ orders: [] as ShopifyOrder[] })),
  ]);

  const store1Currency = store1.orders[0]?.currency ?? "GBP";
  const store2Currency = store2.orders[0]?.currency ?? "AED";

  type Bucket = { orderCount: number; totalSales: number };
  const bucket = (orders: ShopifyOrder[]): Map<string, Bucket> => {
    const m = new Map<string, Bucket>();
    for (const o of orders) {
      if (o.cancelled_at) continue;
      const key = bahrainDateKeyForInstant(o.created_at ?? new Date().toISOString());
      const b = m.get(key) ?? { orderCount: 0, totalSales: 0 };
      b.orderCount += 1;
      b.totalSales += Number.parseFloat(o.total_price) || 0;
      m.set(key, b);
    }
    return m;
  };

  const store1Buckets = bucket(store1.orders);
  const store2Buckets = bucket(store2.orders);

  return dayPoints.map((d) => {
    const s1 = store1Buckets.get(d.dateKey) ?? { orderCount: 0, totalSales: 0 };
    const s2 = store2Buckets.get(d.dateKey) ?? { orderCount: 0, totalSales: 0 };
    return {
      dateKey: d.dateKey,
      label: shortBahrainDayLabel(d.dateKey),
      stores: [
        { store: STORE_LABELS[1], currency: store1Currency, ...s1 },
        { store: STORE_LABELS[2], currency: store2Currency, ...s2 },
      ],
    };
  });
}
