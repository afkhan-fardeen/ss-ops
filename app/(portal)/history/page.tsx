import { AlertTriangle, History as HistoryIcon } from "lucide-react";
import { getSupabaseService } from "@/lib/supabase/service";
import { HistoryTable, type HistoryRow } from "@/components/history/HistoryTable";
import type { FulfillmentLogRow } from "@/lib/supabase/types";

export const revalidate = 30;

const PAGE_SIZE = 200;

export default async function HistoryPage() {
  const supabase = getSupabaseService();

  if (!supabase) {
    return (
      <div className="mx-auto max-w-2xl rounded-card border border-portal-amber/25 bg-portal-amberSoft p-6 text-portal-text">
        <div className="flex items-center gap-2 text-portal-amber">
          <AlertTriangle size={18} />
          <h2 className="text-base font-semibold">Supabase not configured</h2>
        </div>
        <p className="mt-2 text-[13px] text-portal-text">
          The history view reads from the <code>fulfillment_log</code> table. Configure
          <code className="ml-1">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> to enable it.
        </p>
      </div>
    );
  }

  let rows: HistoryRow[] = [];
  let error: string | null = null;

  try {
    const { data, error: err } = await supabase
      .from("fulfillment_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (err) throw new Error(err.message);

    const logs = (data ?? []) as FulfillmentLogRow[];

    // Resolve user emails for created_by in a single follow-up query.
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

    rows = logs.map((log) => ({
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
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load history";
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl rounded-card border border-portal-red/25 bg-portal-redSoft p-6 text-portal-text">
        <div className="flex items-center gap-2 text-portal-red">
          <AlertTriangle size={18} />
          <h2 className="text-base font-semibold">Could not load history</h2>
        </div>
        <p className="mt-2 text-[13px] text-portal-text">{error}</p>
      </div>
    );
  }

  const successCount = rows.filter((r) => r.status === "success").length;
  const errorCount = rows.length - successCount;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="animate-fade-up rounded-card border border-portal-border bg-portal-bg2 p-5 shadow-soft">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-portal-text3">
              <HistoryIcon size={13} /> Fulfillment history
            </h2>
            <p className="mt-1 text-[14px] font-medium text-portal-text">
              Latest {rows.length} push{rows.length === 1 ? "" : "es"} across COD and Fulfillment
            </p>
          </div>
          <p className="font-mono text-[11px] text-portal-text3">
            {successCount} success · {errorCount} error
          </p>
        </div>
      </section>

      <HistoryTable rows={rows} />
    </div>
  );
}
