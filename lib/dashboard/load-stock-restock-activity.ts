import { getSupabaseService } from "@/lib/supabase/service";
import { loadStockRestockSummary } from "@/lib/stock/load-restock-history";
import {
  bucketStatusRows,
  emptyDailyCounts,
  emptyDailyStatus,
  type DailyCount,
  type DailyStatusSplit,
} from "@/lib/dashboard/bucket-by-day";

export type StockRestockActivity = {
  lastRestockAt: string | null;
  restocksLast7Days: number;
  restocksLast14Days: number;
  dailyRestocks: DailyCount[];
  dailyStatus: DailyStatusSplit[];
  error: string | null;
};

export async function loadStockRestockActivity(days = 14): Promise<StockRestockActivity> {
  const summary = await loadStockRestockSummary();
  const empty = {
    lastRestockAt: summary.lastRestockAt,
    restocksLast7Days: summary.restocksLast7Days,
    restocksLast14Days: 0,
    dailyRestocks: emptyDailyCounts(days),
    dailyStatus: emptyDailyStatus(days),
    error: summary.error,
  };

  const supabase = getSupabaseService();
  if (!supabase) return { ...empty, error: "Supabase not configured" };

  try {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - (days - 1));
    since.setUTCHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("stock_restock_log")
      .select("created_at, status")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as { created_at: string; status: string }[];

    const dailyStatus = bucketStatusRows(
      rows.map((r) => ({ at: r.created_at, status: r.status === "success" ? "success" : "error" })),
      days,
    );

    const dailyRestocks = dailyStatus.map((b) => ({
      date: b.date,
      label: b.label,
      count: b.success,
    }));

    const restocksLast14Days = rows.filter((r) => r.status === "success").length;

    return {
      lastRestockAt: summary.lastRestockAt,
      restocksLast7Days: summary.restocksLast7Days,
      restocksLast14Days,
      dailyRestocks,
      dailyStatus,
      error: null,
    };
  } catch (e) {
    return {
      ...empty,
      error: e instanceof Error ? e.message : "Failed to load stock activity",
    };
  }
}
