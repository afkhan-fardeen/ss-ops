import {
  formatSpendRowTotals,
  type SpendBreakdownRow,
} from "@/lib/subscriptions/load-dashboard-summary";

export function SubscriptionSpendBreakdown({
  title,
  rows,
  emptyMessage = "No active spend yet.",
}: {
  title: string;
  rows: SpendBreakdownRow[];
  emptyMessage?: string;
}) {
  const maxProxy = Math.max(...rows.map((r) => r.monthlyEquivalentProxy), 0);

  return (
    <div className="rounded-card border border-line bg-white p-5 shadow-soft">
      <h3 className="text-[13px] font-medium text-ink">{title}</h3>
      <p className="mt-0.5 text-[12px] text-muted">Active · est. monthly equivalent</p>
      {rows.length === 0 ? (
        <p className="mt-6 text-center text-[12px] text-muted">{emptyMessage}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => {
            const widthPct =
              maxProxy > 0
                ? Math.max(8, (r.monthlyEquivalentProxy / maxProxy) * 100)
                : Math.max(8, (r.count / Math.max(...rows.map((x) => x.count), 1)) * 100);
            return (
              <li key={r.label}>
                <div className="mb-1 flex items-start justify-between gap-3 text-[12px]">
                  <div className="min-w-0">
                    <span className="block truncate text-ink">{r.label}</span>
                    <span className="text-[11px] text-muted">
                      {r.count} plan{r.count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <span className="shrink-0 text-right font-mono tabular-nums text-ink">
                    {formatSpendRowTotals(r.totals)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
                  <div
                    className="h-full rounded-full bg-subscriptions"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
