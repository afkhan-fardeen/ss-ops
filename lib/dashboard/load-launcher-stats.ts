import { getSupabaseService } from "@/lib/supabase/service";
import { getCollectionWindow } from "@/lib/datetime/collection-window";

export type LauncherStat = { value: string; label: string } | null;

export type LauncherStats = {
  cod: LauncherStat;
  fulfillment: LauncherStat;
  stock: LauncherStat;
  stockAnalysis: LauncherStat;
  subscriptions: LauncherStat;
  stockAlerts: LauncherStat;
};

const EMPTY_STATS: LauncherStats = {
  cod: null,
  fulfillment: null,
  stock: null,
  stockAnalysis: null,
  subscriptions: null,
  stockAlerts: null,
};

function relativeToNow(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/**
 * Quick-glance stats for the launcher module cards. Every query here is a single
 * indexed count (head requests, no row payloads) or a one-row snapshot read —
 * safe to run on a force-dynamic page. Any failure degrades to `null` (card just
 * shows no stat) rather than breaking the launcher.
 */
export async function loadLauncherStats(): Promise<LauncherStats> {
  const supabase = getSupabaseService();
  if (!supabase) return EMPTY_STATS;

  const window = getCollectionWindow();

  const [codRes, fulfillmentRes, stockRes, subsRes, alertsRes] = await Promise.allSettled([
    supabase
      .from("shopify_orders_cache")
      .select("*", { count: "exact", head: true })
      .eq("is_cod", true)
      .gte("created_at", window.createdAtMinIso)
      .lt("created_at", window.createdAtMaxIso),
    supabase
      .from("shopify_orders_cache")
      .select("*", { count: "exact", head: true })
      .or("fulfillment_status.is.null,fulfillment_status.neq.fulfilled"),
    supabase
      .from("stock_mismatch_snapshots")
      .select("mismatched_count, products_short, captured_at")
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("subscription_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("stock_alert_snapshots")
      .select("critical_count, warning_count, captured_at")
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const cod =
    codRes.status === "fulfilled" && !codRes.value.error && codRes.value.count !== null
      ? { value: String(codRes.value.count), label: "in today's window" }
      : null;

  const fulfillment =
    fulfillmentRes.status === "fulfilled" &&
    !fulfillmentRes.value.error &&
    fulfillmentRes.value.count !== null
      ? { value: String(fulfillmentRes.value.count), label: "unfulfilled" }
      : null;

  const snapshot =
    stockRes.status === "fulfilled" && !stockRes.value.error
      ? (stockRes.value.data as {
          mismatched_count: number;
          products_short: number | null;
          captured_at: string;
        } | null)
      : null;

  const stock = snapshot
    ? { value: String(snapshot.mismatched_count), label: `mismatches · ${relativeToNow(snapshot.captured_at)}` }
    : null;

  const stockAnalysis =
    snapshot && snapshot.products_short !== null
      ? { value: String(snapshot.products_short), label: `products short · ${relativeToNow(snapshot.captured_at)}` }
      : null;

  const subscriptions =
    subsRes.status === "fulfilled" && !subsRes.value.error && subsRes.value.count !== null
      ? { value: String(subsRes.value.count), label: "pending" }
      : null;

  const alertSnapshot =
    alertsRes.status === "fulfilled" && !alertsRes.value.error
      ? (alertsRes.value.data as {
          critical_count: number;
          warning_count: number;
          captured_at: string;
        } | null)
      : null;

  const stockAlerts = alertSnapshot
    ? {
        value: String(alertSnapshot.critical_count),
        label: `critical · ${relativeToNow(alertSnapshot.captured_at)}`,
      }
    : null;

  return { cod, fulfillment, stock, stockAnalysis, subscriptions, stockAlerts };
}
