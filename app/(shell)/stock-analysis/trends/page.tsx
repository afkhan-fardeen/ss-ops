import { canAccessModule } from "@/lib/auth/can-access-module";

export const dynamic = "force-dynamic";

export default async function StockAnalysisTrendsPage() {
  if (!(await canAccessModule("stockAnalysis"))) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-line bg-white p-8 shadow-soft">
        <h1 className="text-lg font-medium text-ink">Access denied</h1>
        <p className="mt-2 text-[13px] text-muted">
          Stock analysis is only available to admins or users granted the Stock Analysis module.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-xl font-medium text-ink">Trends</h1>
        <p className="mt-1 text-[13px] text-muted">
          Deeper history comes after we have more sweeps.
        </p>
      </header>
      <div className="rounded-card border border-line bg-white p-6 shadow-soft">
        <p className="text-[13px] text-ink">
          The dashboard already plots each mismatch sweep and 14-day sync outcomes. A longer
          30/90-day view with category filters will land once those sweeps have a real history to
          dig into.
        </p>
      </div>
    </div>
  );
}
