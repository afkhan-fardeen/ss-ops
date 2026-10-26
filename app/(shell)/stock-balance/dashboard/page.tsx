import Link from "next/link";
import { canAccessModule } from "@/lib/auth/can-access-module";
import { loadStockRestockActivity } from "@/lib/dashboard/load-stock-restock-activity";
import { loadStockAnalysisSummary } from "@/lib/dashboard/load-stock-analysis-summary";
import { STOCK_ACCENT } from "@/config/modules";
import { ActivityBarChart } from "@/components/dashboard/ActivityBarChart";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { ModuleDashboardShell } from "@/components/portal/ModuleDashboardShell";
import { ModuleAccessDenied } from "@/components/portal/ModuleAccessDenied";
import { ProductSearchCard } from "@/components/stock/ProductSearchCard";

export const dynamic = "force-dynamic";

function sweepAgeHint(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return new Date(iso).toLocaleString();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1d ago — stale" : `${days}d ago — stale`;
}

export default async function StockOverviewPage() {
  if (!(await canAccessModule("stock"))) {
    return (
      <ModuleAccessDenied description="Stock is only available to admins or users granted the Stock module." />
    );
  }

  const [activity, summary] = await Promise.all([loadStockRestockActivity(14), loadStockAnalysisSummary()]);
  const latest = summary.latest;

  const restocksChart = activity.dailyRestocks.map((d) => ({ label: d.label, value: d.count }));
  const bestSellerChart = summary.bestSellers30d.map((p) => ({
    label: p.title.length > 28 ? `${p.title.slice(0, 26)}…` : p.title,
    value: p.unitsSold,
  }));
  const errors14d = activity.dailyStatus.reduce((s, d) => s + d.error, 0);

  return (
    <ModuleDashboardShell
      moduleId="stock"
      title="Stock overview"
      description="Commitment, shortages and restock activity across both stores, with a product lookup. Fix stock on the Balance page."
      kpi={
        <>
          <StatCard
            label="Total committed"
            value={latest?.totalCommitted != null ? String(latest.totalCommitted) : "—"}
            hint={latest ? sweepAgeHint(latest.capturedAt) : "Run “Find all mismatches” on Balance"}
          />
          <StatCard
            label="Products short"
            value={latest?.productsShort != null ? String(latest.productsShort) : "—"}
            hint="Committed orders exceed Ubex stock"
          />
          <StatCard
            label="Restocks (7d)"
            value={String(activity.restocksLast7Days)}
            hint={`${summary.unitsSold14d} units sold (14d)`}
          />
          <StatCard label="Restock errors (14d)" value={String(errors14d)} hint={errors14d > 0 ? "See Errors and History" : "All clear"} />
        </>
      }
      charts={
        <>
          <ChartCard title="Best sellers (30d)" description="Top products by units sold">
            <ActivityBarChart
              data={bestSellerChart}
              fill={STOCK_ACCENT.chartFill}
              valueLabel="Units sold"
              emptyMessage="No sales data yet."
            />
          </ChartCard>
          <ChartCard title="Restocks per day" description="Successful Shopify inventory updates">
            <ActivityBarChart
              data={restocksChart}
              fill={STOCK_ACCENT.chartFill}
              valueLabel="Restocks"
              emptyMessage="No restocks in the last 14 days."
            />
          </ChartCard>
        </>
      }
    >
      {summary.error ? (
        <div className="rounded-card border border-danger-line bg-danger-soft px-4 py-3 text-body text-danger">
          {summary.error}
        </div>
      ) : null}

      <ProductSearchCard />

      <div id="currently-short" className="mt-4 scroll-mt-20 rounded-card border border-line bg-white p-4 shadow-soft">
        <h2 className="text-heading font-semibold text-ink">Currently short</h2>
        <p className="mt-0.5 text-body text-muted">Products where committed orders exceed Ubex stock.</p>
        {!latest?.shortProducts.length ? (
          <p className="mt-3 text-body text-muted">
            {latest
              ? "No short products in the latest sweep."
              : "Run “Find all mismatches” on the Balance page to capture commitment totals."}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {latest.shortProducts.map((row) => (
              <li key={row.barcode} className="flex items-center justify-between gap-3 py-3 text-body">
                <div className="min-w-0">
                  <p className="truncate text-ink">{row.productName}</p>
                  <p className="font-mono text-body-sm text-muted">{row.barcode}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono tabular-nums text-danger">{row.shortBy} short</p>
                  <Link
                    href={`/stock-balance/balance?search=${encodeURIComponent(row.barcode)}`}
                    className="text-body font-medium text-primary hover:underline"
                  >
                    Open in Balance
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ModuleDashboardShell>
  );
}
