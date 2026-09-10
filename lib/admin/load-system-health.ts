import { pingBothStores, type StoreConnectionStatus } from "@/lib/shopify/ping-store";
import { getUbexToken, ubexFetch } from "@/lib/ubex/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseService } from "@/lib/supabase/service";
import { getAuthMode } from "@/lib/auth/mode";
import { getRecentCronRuns, type CronRunLog } from "@/lib/supabase/cron-run-log";
import { bucketStatusRows, type DailyStatusSplit } from "@/lib/dashboard/bucket-by-day";

const LOOKBACK_DAYS = 14;
const STUCK_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

export type UbexConnectivity = { configured: boolean; ok: boolean; error?: string };

export type Connectivity = {
  store1: StoreConnectionStatus;
  store2: StoreConnectionStatus;
  ubex: UbexConnectivity;
  supabaseConfigured: boolean;
};

export type HealthFailureRow = {
  id: string;
  source: "Fulfillment" | "Stock restock" | "COD email";
  at: string;
  detail: string;
  error: string | null;
};

export type ConfigCheck = { label: string; ok: boolean; hint?: string };

export type SystemHealth = {
  connectivity: Connectivity;
  recentFailures: HealthFailureRow[];
  cronRuns: CronRunLog[];
  errorTrend: DailyStatusSplit[];
  configChecks: ConfigCheck[];
  stuckFulfillmentCount: number;
  stuckStockRestockCount: number;
};

async function checkUbex(): Promise<UbexConnectivity> {
  const token = getUbexToken();
  if (!token) return { configured: false, ok: false };
  try {
    const res = await ubexFetch("/api/meta/statuses");
    if (res.ok) return { configured: true, ok: true };
    return { configured: true, ok: false, error: `HTTP ${res.status}` };
  } catch (e) {
    return { configured: true, ok: false, error: e instanceof Error ? e.message : "fetch failed" };
  }
}

async function loadRecentFulfillmentFailures(limit: number): Promise<HealthFailureRow[]> {
  const supabase = getSupabaseService();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("fulfillment_log")
    .select("id, shopify_order_name, error, created_at")
    .eq("status", "error")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r) => ({
    id: `fulfillment-${r.id}`,
    source: "Fulfillment" as const,
    at: r.created_at,
    detail: r.shopify_order_name,
    error: r.error,
  }));
}

async function loadRecentStockRestockFailures(limit: number): Promise<HealthFailureRow[]> {
  const supabase = getSupabaseService();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("stock_restock_log")
    .select("id, barcode, error, created_at")
    .eq("status", "error")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r) => ({
    id: `stock-restock-${r.id}`,
    source: "Stock restock" as const,
    at: r.created_at,
    detail: r.barcode,
    error: r.error,
  }));
}

async function loadRecentCodEmailFailures(limit: number): Promise<HealthFailureRow[]> {
  const supabase = getSupabaseService();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("cod_email_log")
    .select("id, recipients, error, sent_at")
    .eq("status", "error")
    .order("sent_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r) => ({
    id: `cod-email-${r.id}`,
    source: "COD email" as const,
    at: r.sent_at,
    detail: r.recipients,
    error: r.error,
  }));
}

/** Combined success/error activity across all three logs, bucketed into a daily trend. */
async function loadErrorTrend(days: number): Promise<DailyStatusSplit[]> {
  const supabase = getSupabaseService();
  if (!supabase) return bucketStatusRows([], days);

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));
  since.setUTCHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();
  const rowCap = 1000;

  const [fulfillment, stockRestock, codEmail] = await Promise.all([
    supabase
      .from("fulfillment_log")
      .select("created_at, status")
      .gte("created_at", sinceIso)
      .limit(rowCap),
    supabase
      .from("stock_restock_log")
      .select("created_at, status")
      .gte("created_at", sinceIso)
      .limit(rowCap),
    supabase
      .from("cod_email_log")
      .select("sent_at, status")
      .gte("sent_at", sinceIso)
      .limit(rowCap),
  ]);

  const rows: { at: string; status: string }[] = [
    ...(fulfillment.data ?? []).map((r) => ({ at: r.created_at as string, status: r.status as string })),
    ...(stockRestock.data ?? []).map((r) => ({ at: r.created_at as string, status: r.status as string })),
    ...(codEmail.data ?? []).map((r) => ({ at: r.sent_at as string, status: r.status as string })),
  ];

  return bucketStatusRows(rows, days);
}

/** Idempotency claims older than the lookback with no matching success log — the failure mode scripts/clear-stuck-idempotency.ts was written to fix. */
async function countStuckFulfillmentIdempotency(): Promise<number> {
  const supabase = getSupabaseService();
  if (!supabase) return 0;
  const sinceIso = new Date(Date.now() - STUCK_LOOKBACK_MS).toISOString();

  const { data: idemRows } = await supabase
    .from("push_idempotency")
    .select("shopify_order_id")
    .gte("created_at", sinceIso)
    .limit(1000);
  if (!idemRows || idemRows.length === 0) return 0;

  const orderIds = [...new Set(idemRows.map((r) => r.shopify_order_id as number))];
  const { data: successLogs } = await supabase
    .from("fulfillment_log")
    .select("shopify_order_id")
    .eq("status", "success")
    .in("shopify_order_id", orderIds);

  const succeeded = new Set((successLogs ?? []).map((r) => r.shopify_order_id as number));
  return idemRows.filter((r) => !succeeded.has(r.shopify_order_id as number)).length;
}

async function countStuckStockRestockIdempotency(): Promise<number> {
  const supabase = getSupabaseService();
  if (!supabase) return 0;
  const sinceIso = new Date(Date.now() - STUCK_LOOKBACK_MS).toISOString();

  const { data: idemRows } = await supabase
    .from("stock_restock_idempotency")
    .select("barcode, store_id")
    .gte("created_at", sinceIso)
    .limit(1000);
  if (!idemRows || idemRows.length === 0) return 0;

  const barcodes = [...new Set(idemRows.map((r) => r.barcode as string))];
  const { data: successLogs } = await supabase
    .from("stock_restock_log")
    .select("barcode, store_id")
    .eq("status", "success")
    .in("barcode", barcodes)
    .gte("created_at", sinceIso);

  const succeeded = new Set(
    (successLogs ?? []).map((r) => `${r.barcode}|${r.store_id}`),
  );
  return idemRows.filter((r) => !succeeded.has(`${r.barcode}|${r.store_id}`)).length;
}

function buildConfigChecks(): ConfigCheck[] {
  const sessionSecret = process.env.SESSION_SECRET;
  const authMode = getAuthMode();
  return [
    {
      label: "Auth mode",
      ok: true,
      hint: authMode === "supabase" ? "Supabase Auth" : "Shared password",
    },
    {
      label: "SESSION_SECRET",
      ok: Boolean(sessionSecret && sessionSecret.length >= 16),
    },
    {
      label: "CRON_SECRET",
      ok: Boolean(process.env.CRON_SECRET?.trim()),
    },
    {
      label: "Supabase service role key",
      ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    {
      label: "Ubex API token",
      ok: Boolean(getUbexToken()),
    },
  ];
}

export async function loadSystemHealth(): Promise<SystemHealth> {
  const [
    { store1, store2 },
    ubex,
    [fulfillmentFailures, stockRestockFailures, codEmailFailures],
    cronRuns,
    errorTrend,
    stuckFulfillmentCount,
    stuckStockRestockCount,
  ] = await Promise.all([
    pingBothStores(),
    checkUbex(),
    Promise.all([
      loadRecentFulfillmentFailures(15),
      loadRecentStockRestockFailures(15),
      loadRecentCodEmailFailures(15),
    ]),
    getRecentCronRuns(10),
    loadErrorTrend(LOOKBACK_DAYS),
    countStuckFulfillmentIdempotency(),
    countStuckStockRestockIdempotency(),
  ]);

  const recentFailures = [...fulfillmentFailures, ...stockRestockFailures, ...codEmailFailures]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 20);

  return {
    connectivity: {
      store1,
      store2,
      ubex,
      supabaseConfigured: isSupabaseConfigured(),
    },
    recentFailures,
    cronRuns,
    errorTrend,
    configChecks: buildConfigChecks(),
    stuckFulfillmentCount,
    stuckStockRestockCount,
  };
}
