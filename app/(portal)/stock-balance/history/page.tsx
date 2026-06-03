import { AlertTriangle, History } from "lucide-react";
import { isPortalAdmin } from "@/lib/auth/is-portal-admin";
import { StockBalanceHistoryTable } from "@/components/stock/StockBalanceHistoryTable";
import { loadStockRestockHistory } from "@/lib/stock/load-restock-history";

export const dynamic = "force-dynamic";
export const revalidate = 30;

export default async function StockBalanceHistoryPage() {
  if (!(await isPortalAdmin())) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-[#EBEBEB] bg-white p-8 shadow-soft">
        <h1 className="text-lg font-semibold text-[#111111]">Access denied</h1>
        <p className="mt-2 text-[13px] text-[#555555]">Stock balance history is admin-only.</p>
      </div>
    );
  }

  const { rows, error } = await loadStockRestockHistory();

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

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="animate-fade-up rounded-card border border-[#EBEBEB] border-l-4 border-l-emerald-500 bg-white p-5 shadow-soft">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-800/80">
          <History size={13} /> Stock balance history
        </h2>
        <p className="mt-1 text-[14px] font-medium text-[#111111]">
          Latest {rows.length} restock action{rows.length === 1 ? "" : "s"} · {successCount} successful
        </p>
      </section>
      <StockBalanceHistoryTable rows={rows} />
    </div>
  );
}
