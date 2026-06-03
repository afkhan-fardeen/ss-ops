import { getSupabaseService } from "@/lib/supabase/service";
import {
  bucketStatusRows,
  emptyDailyCounts,
  emptyDailyStatus,
  lastNDays,
  type DailyCount,
  type DailyStatusSplit,
} from "@/lib/dashboard/bucket-by-day";

export type CodEmailActivity = {
  emailsLast14Days: number;
  ordersEmailedLast14Days: number;
  lastSentAt: string | null;
  lastOrderCount: number | null;
  dailySends: DailyCount[];
  dailyOrders: DailyCount[];
  dailyStatus: DailyStatusSplit[];
  error: string | null;
};

export async function loadCodEmailActivity(days = 14): Promise<CodEmailActivity> {
  const empty = {
    emailsLast14Days: 0,
    ordersEmailedLast14Days: 0,
    lastSentAt: null,
    lastOrderCount: null,
    dailySends: emptyDailyCounts(days),
    dailyOrders: emptyDailyCounts(days),
    dailyStatus: emptyDailyStatus(days),
    error: null as string | null,
  };

  const supabase = getSupabaseService();
  if (!supabase) return { ...empty, error: "Supabase not configured" };

  try {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - (days - 1));
    since.setUTCHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("cod_email_log")
      .select("sent_at, order_count, status")
      .gte("sent_at", since.toISOString())
      .order("sent_at", { ascending: false })
      .limit(500);

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as { sent_at: string; order_count: number; status: string }[];
    const dayBuckets = lastNDays(days);
    const start = dayBuckets[0]!.date;

    const dailySends = dayBuckets.map((b) => ({ ...b, count: 0 }));
    const dailyOrders = dayBuckets.map((b) => ({ ...b, count: 0 }));

    for (const row of rows) {
      const date = row.sent_at.slice(0, 10);
      if (date < start) continue;
      const sendRow = dailySends.find((b) => b.date === date);
      const orderRow = dailyOrders.find((b) => b.date === date);
      if (sendRow) sendRow.count += 1;
      if (orderRow) orderRow.count += row.order_count ?? 0;
    }

    const dailyStatus = bucketStatusRows(
      rows.map((r) => ({ at: r.sent_at, status: r.status === "success" ? "success" : "error" })),
      days,
    );

    const latest = rows[0];

    return {
      emailsLast14Days: rows.length,
      ordersEmailedLast14Days: rows.reduce((s, r) => s + (r.order_count ?? 0), 0),
      lastSentAt: latest?.sent_at ?? null,
      lastOrderCount: latest?.order_count ?? null,
      dailySends,
      dailyOrders,
      dailyStatus,
      error: null,
    };
  } catch (e) {
    return {
      ...empty,
      error: e instanceof Error ? e.message : "Failed to load COD activity",
    };
  }
}
