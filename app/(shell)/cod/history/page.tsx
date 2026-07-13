import { AlertTriangle, History } from "lucide-react";
import { CodEmailHistoryTable } from "@/components/cod/CodEmailHistoryTable";
import { loadCodEmailHistory } from "@/lib/cod/load-cod-email-history";

export const dynamic = "force-dynamic";
export const revalidate = 30;

export default async function CodHistoryPage() {
  const { rows, error } = await loadCodEmailHistory();

  if (error) {
    return (
      <div className="mx-auto max-w-2xl rounded-card border border-[#C25151]/25 bg-[rgba(194,81,81,0.10)] p-6">
        <div className="flex items-center gap-2 text-[#C25151]">
          <AlertTriangle size={18} />
          <h2 className="text-base font-medium">Could not load history</h2>
        </div>
        <p className="mt-2 text-[13px] text-ink">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="animate-fade-up rounded-card border border-line border-l-4 border-l-cod bg-white p-5 shadow-soft">
        <h2 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-cod/80">
          <History size={13} /> COD history
        </h2>
        <p className="mt-1 text-[14px] font-medium text-ink">
          Latest {rows.length} COD list email{rows.length === 1 ? "" : "s"} sent from the portal
        </p>
      </section>
      <CodEmailHistoryTable rows={rows} />
    </div>
  );
}
