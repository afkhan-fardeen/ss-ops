import { getSupabaseService } from "@/lib/supabase/service";
import type { HistoryRow } from "@/components/history/HistoryTable";
import type { FulfillmentLogRow } from "@/lib/supabase/types";

const PAGE_SIZE = 200;

export async function loadFulfillmentHistory(): Promise<{
  rows: HistoryRow[];
  error: string | null;
}> {
  const supabase = getSupabaseService();
  if (!supabase) {
    return { rows: [], error: "Supabase not configured" };
  }

  try {
    const { data, error: err } = await supabase
      .from("fulfillment_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (err) throw new Error(err.message);

    const logs = (data ?? []) as FulfillmentLogRow[];

    const userIds = Array.from(
      new Set(logs.map((l) => l.created_by).filter((x): x is string => Boolean(x))),
    );
    const emailById = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,email")
        .in("id", userIds);
      for (const p of (profiles ?? []) as { id: string; email: string }[]) {
        emailById.set(p.id, p.email);
      }
    }

    const rows: HistoryRow[] = logs.map((log) => ({
      id: log.id,
      createdAt: log.created_at,
      orderId: log.shopify_order_id,
      orderName: log.shopify_order_name,
      tracking: log.ubex_tracking,
      trackingUrl: log.tracking_url,
      trackingCompany: log.tracking_company,
      status: log.status,
      error: log.error,
      fulfillmentId: log.shopify_fulfillment_id,
      userEmail: log.created_by ? emailById.get(log.created_by) ?? null : null,
    }));

    return { rows, error: null };
  } catch (e) {
    return {
      rows: [],
      error: e instanceof Error ? e.message : "Failed to load history",
    };
  }
}
