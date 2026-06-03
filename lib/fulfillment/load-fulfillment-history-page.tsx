import { AlertTriangle, History as HistoryIcon } from "lucide-react";
import { HistoryTable } from "@/components/history/HistoryTable";
import { loadFulfillmentHistory } from "@/lib/fulfillment/load-fulfillment-history";

export async function FulfillmentHistoryContent() {
  const { rows, error } = await loadFulfillmentHistory();

  if (error === "Supabase not configured") {
    return (
      <div className="mx-auto max-w-2xl rounded-card border border-[#F0B743]/25 bg-[rgba(240,183,67,0.12)] p-6">
        <div className="flex items-center gap-2 text-[#F0B743]">
          <AlertTriangle size={18} />
          <h2 className="text-base font-semibold">Supabase not configured</h2>
        </div>
        <p className="mt-2 text-[13px] text-[#111111]">
          Configure <code className="ml-1">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code>.
        </p>
      </div>
    );
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
      <section className="animate-fade-up rounded-card border border-[#EBEBEB] border-l-4 border-l-[#E57373] bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#9B2C2C]">
              <HistoryIcon size={13} /> Fulfillment history
            </h2>
            <p className="mt-1 text-[14px] font-medium text-[#111111]">
              Latest {rows.length} push{rows.length === 1 ? "" : "es"}
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
