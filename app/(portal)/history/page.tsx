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
      <div className="mx-auto max-w-2xl rounded-card border border-[#F0B743]/25 bg-[rgba(240,183,67,0.12)] p-6">
        <div className="flex items-center gap-2 text-[#F0B743]">
          <AlertTriangle size={18} />
          <h2 className="text-base font-semibold">Supabase not configured</h2>
        </div>
        <p className="mt-2 text-[13px] text-[#111111]">
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
      <div className="mx-auto max-w-2xl rounded-card border border-[#C25151]/25 bg-[rgba(194,81,81,0.10)] p-6">
        <div className="flex items-center gap-2 text-[#C25151]">
          <AlertTriangle size={18} />
          <h2 className="text-base font-semibold">Could not load history</h2>
        </div>
        <p className="mt-2 text-[13px] text-[#111111]">{error}</p>
      </div>
    );
  }

  const successCount = rows.filter((r) => r.status === "success").length;
  const cronCount = rows.filter((r) => r.userEmail === null && r.status === "success").length;
  const manualCount = rows.filter((r) => r.userEmail !== null && r.status === "success").length;
  const errorCount = rows.length - successCount;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="animate-fade-up rounded-card border border-[#EBEBEB] bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#999999]">
              <HistoryIcon size={13} /> Fulfillment history
            </h2>
            <p className="mt-1 text-[14px] font-medium text-[#111111]">
              Latest {rows.length} push{rows.length === 1 ? "" : "es"} across COD and Fulfillment
            </p>
          </div>
          <p className="font-mono text-[11px] text-[#999999]">
            {successCount} fulfilled · {manualCount} manual · {cronCount} bot · {errorCount} error
          </p>
        </div>
      </section>

      <HistoryTable rows={rows} />
    </div>
  );
}
