import { getSupabaseService } from "@/lib/supabase/service";
import {
  bucketStatusRows,
  emptyDailyCounts,
  emptyDailyStatus,
  type DailyCount,
  type DailyStatusSplit,
} from "@/lib/dashboard/bucket-by-day";

export type FulfillmentActivity = {
  pushesLast7Days: number;
  pushesLast14Days: number;
  successRate14d: number | null;
  dailyPushes: DailyCount[];
  dailyStatus: DailyStatusSplit[];
  error: string | null;
};

export async function loadFulfillmentActivity(days = 14): Promise<FulfillmentActivity> {
  const empty = {
    pushesLast7Days: 0,
    pushesLast14Days: 0,
    successRate14d: null,
    dailyPushes: emptyDailyCounts(days),
    dailyStatus: emptyDailyStatus(days),
    error: null as string | null,
  };

  const supabase = getSupabaseService();
  if (!supabase) return { ...empty, error: "Supabase not configured" };

  try {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - (days - 1));
    since.setUTCHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("fulfillment_log")
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

    const dailyPushes = dailyStatus.map((b) => ({
      date: b.date,
      label: b.label,
      count: b.success + b.error,
    }));

    const successCount = rows.filter((r) => r.status === "success").length;
    const pushesLast7Days = rows.filter((r) => r.created_at >= sevenDaysAgo).length;

    return {
      pushesLast14Days: rows.length,
      pushesLast7Days,
      successRate14d: rows.length > 0 ? Math.round((successCount / rows.length) * 100) : null,
      dailyPushes,
      dailyStatus,
      error: null,
    };
  } catch (e) {
    return {
      ...empty,
      error: e instanceof Error ? e.message : "Failed to load fulfillment activity",
    };
  }
}
