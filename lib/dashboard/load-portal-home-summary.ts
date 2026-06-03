import { lastNDays } from "@/lib/dashboard/bucket-by-day";
import { loadCodEmailActivity } from "@/lib/dashboard/load-cod-email-activity";
import { loadFulfillmentActivity } from "@/lib/dashboard/load-fulfillment-activity";
import { loadStockRestockActivity } from "@/lib/dashboard/load-stock-restock-activity";

export type CombinedDailySeries = {
  date: string;
  label: string;
  codOrders: number;
  fulfillments: number;
  restocks: number;
};

export type PortalHomeSummary = {
  cod: Awaited<ReturnType<typeof loadCodEmailActivity>>;
  fulfillment: Awaited<ReturnType<typeof loadFulfillmentActivity>>;
  stock: Awaited<ReturnType<typeof loadStockRestockActivity>>;
  combinedDaily: CombinedDailySeries[];
};

export async function loadPortalHomeSummary(
  showStock: boolean,
  days = 14,
): Promise<PortalHomeSummary> {
  const [cod, fulfillment, stock] = await Promise.all([
    loadCodEmailActivity(days),
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
    const codRow = cod.dailyOrders.find((d) => d.date === b.date);
    const ffRow = fulfillment.dailyPushes.find((d) => d.date === b.date);
    const stockRow = stock.dailyRestocks.find((d) => d.date === b.date);
    return {
      date: b.date,
      label: b.label,
      codOrders: codRow?.count ?? 0,
      fulfillments: ffRow?.count ?? 0,
      restocks: stockRow?.count ?? 0,
    };
  });

  return { cod, fulfillment, stock, combinedDaily };
}
