import { lastNDays } from "@/lib/dashboard/bucket-by-day";
import { loadFulfillmentActivity } from "@/lib/dashboard/load-fulfillment-activity";
import { loadStockRestockActivity } from "@/lib/dashboard/load-stock-restock-activity";

export type CombinedDailySeries = {
  date: string;
  label: string;
  fulfillments: number;
  restocks: number;
};

export type PortalHomeSummary = {
  fulfillment: Awaited<ReturnType<typeof loadFulfillmentActivity>>;
  stock: Awaited<ReturnType<typeof loadStockRestockActivity>>;
  combinedDaily: CombinedDailySeries[];
};

export async function loadPortalHomeSummary(
  showStock: boolean,
  days = 14,
): Promise<PortalHomeSummary> {
  const [fulfillment, stock] = await Promise.all([
    loadFulfillmentActivity(days),
    showStock ? loadStockRestockActivity(days) : Promise.resolve({
      lastRestockAt: null,
      restocksLast7Days: 0,
      restocksLast14Days: 0,
      dailyRestocks: lastNDays(days).map((b) => ({ ...b, count: 0 })),
      dailyStatus: lastNDays(days).map((b) => ({ ...b, success: 0, error: 0 })),
      error: null,
    }),
  ]);

  const combinedDaily: CombinedDailySeries[] = lastNDays(days).map((b) => {
    const ffRow = fulfillment.dailyPushes.find((d) => d.date === b.date);
    const stockRow = stock.dailyRestocks.find((d) => d.date === b.date);
    return {
      date: b.date,
      label: b.label,
      fulfillments: ffRow?.count ?? 0,
      restocks: stockRow?.count ?? 0,
    };
  });

  return { fulfillment, stock, combinedDaily };
}
