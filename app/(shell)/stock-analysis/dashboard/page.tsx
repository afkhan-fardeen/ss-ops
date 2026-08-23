import Link from "next/link";
import { canAccessModule } from "@/lib/auth/can-access-module";
import { STOCK_ANALYSIS_ACCENT } from "@/config/modules";
import { loadStockAnalysisSummary } from "@/lib/dashboard/load-stock-analysis-summary";
import { ActivityBarChart } from "@/components/dashboard/ActivityBarChart";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { ModuleDashboardShell, ModuleQuickLinks } from "@/components/portal/ModuleDashboardShell";
import { ProductSearchCard } from "@/components/stock-analysis/ProductSearchCard";

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

export default async function StockAnalysisDashboardPage() {
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

  const summary = await loadStockAnalysisSummary();
  const latest = summary.latest;

  const bestSellerChart = summary.bestSellers30d.map((p) => ({
    label: p.title.length > 28 ? `${p.title.slice(0, 26)}…` : p.title,
    value: p.unitsSold,
  }));

  return (
    <ModuleDashboardShell
      moduleId="stockAnalysis"
      title="Stock analysis"
      description="Read-only inventory commitment and sales visibility across both stores. No sync actions here."
      kpi={
        <>
          <StatCard
            label="Total committed"
            value={latest?.totalCommitted != null ? String(latest.totalCommitted) : "—"}
            hint={latest ? sweepAgeHint(latest.capturedAt) : "Run Find all mismatches on Balance"}
          />
          <StatCard
            label="Can be fulfilled now"
            value={latest?.canBeSent != null ? String(latest.canBeSent) : "—"}
            hint="Units coverable by Ubex stock today"
          />
          <StatCard
            label="Products short"
            value={latest?.productsShort != null ? String(latest.productsShort) : "—"}
            hint="Backorder risk (committed &gt; Ubex)"
          />
          <StatCard
            label="Units sold (14d)"
            value={String(summary.unitsSold14d)}
            hint={
              summary.unitsSold14d === 0
                ? "Run backfill-order-line-items if empty"
                : "Both stores combined"
            }
          />
        </>
      }
      charts={
        <ChartCard title="Best sellers (30d)" description="Top products by units sold">
          <ActivityBarChart
            data={bestSellerChart}
            fill={STOCK_ANALYSIS_ACCENT.chartFill}
            valueLabel="Units sold"
            emptyMessage="No sales data yet — run scripts/backfill-order-line-items.ts after migration 018."
          />
        </ChartCard>
      }
    >
      {summary.error ? (
        <div className="rounded-card border border-[#C25151]/30 bg-[rgba(194,81,81,0.08)] px-4 py-3 text-[13px] text-[#C25151]">
          {summary.error}
        </div>
      ) : null}

      <ProductSearchCard />

      <div className="mt-4 rounded-card border border-line bg-white p-4 shadow-soft">
        <h2 className="text-[13px] font-medium text-ink">Currently short</h2>
        <p className="mt-0.5 text-[12px] text-muted">
          Products where committed orders exceed Ubex stock — visibility only
        </p>
        {!latest?.shortProducts.length ? (
          <p className="mt-3 text-[13px] text-muted">
            {latest
              ? "No short products in the latest sweep."
              : 'Run "Find all mismatches" on the Balance page to capture commitment totals.'}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {latest.shortProducts.map((row) => (
              <li key={row.barcode} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                <div className="min-w-0">
                  <p className="truncate text-ink">{row.productName}</p>
                  <p className="font-mono text-[11px] text-muted">{row.barcode}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono tabular-nums text-[#C25151]">{row.shortBy} short</p>
                  <Link
                    href={`/stock-balance/balance?search=${encodeURIComponent(row.barcode)}`}
                    className="text-[12px] font-medium text-stock-analysis hover:underline"
                  >
                    Open in Balance
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4">
        <ModuleQuickLinks
          moduleId="stockAnalysis"
          links={[
            { label: "Balance", href: "/stock-balance/balance", description: "Fix stock and sync" },
            { label: "Errors", href: "/stock-balance/errors", description: "Current sync problems" },
          ]}
        />
      </div>
    </ModuleDashboardShell>
  );
}
