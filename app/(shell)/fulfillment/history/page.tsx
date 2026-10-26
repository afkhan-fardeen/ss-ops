import { AlertTriangle, History as HistoryIcon } from "lucide-react";
import { HistoryTable } from "@/components/history/HistoryTable";
import { loadFulfillmentHistory } from "@/lib/fulfillment/load-fulfillment-history";

export const revalidate = 30;

export default async function FulfillmentHistoryPage() {
  const { rows, error } = await loadFulfillmentHistory();

  if (error === "Supabase not configured") {
    return (
      <div className="mx-auto max-w-2xl rounded-card border border-warning/25 bg-warning-soft p-6">
        <div className="flex items-center gap-2 text-warning">
          <AlertTriangle size={18} />
          <h2 className="text-heading font-semibold">Supabase not configured</h2>
        </div>
        <p className="mt-2 text-body text-ink">
          Configure <code className="ml-1">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code>.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl rounded-card border border-danger/25 bg-danger-soft p-6">
        <div className="flex items-center gap-2 text-danger">
          <AlertTriangle size={18} />
          <h2 className="text-heading font-semibold">Could not load history</h2>
        </div>
        <p className="mt-2 text-body text-ink">{error}</p>
      </div>
    );
  }

  const successCount = rows.filter((r) => r.status === "success").length;
  const cronCount = rows.filter((r) => r.userEmail === null && r.status === "success").length;
  const manualCount = rows.filter((r) => r.userEmail !== null && r.status === "success").length;
  const errorCount = rows.length - successCount;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="animate-fade-up rounded-card border border-line border-l-4 border-l-primary bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wide max-md:normal-case max-md:tracking-normal text-primary">
              <HistoryIcon size={13} /> Fulfillment history
            </h2>
            <p className="mt-1 text-body-lg font-medium text-ink">
              Latest {rows.length} push{rows.length === 1 ? "" : "es"}
            </p>
          </div>
          <p className="font-mono text-caption text-muted">
            {successCount} fulfilled · {manualCount} manual · {cronCount} bot · {errorCount} error
          </p>
        </div>
      </section>
      <HistoryTable rows={rows} />
    </div>
  );
}
