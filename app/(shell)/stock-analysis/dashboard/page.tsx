import Link from "next/link";
import { canAccessModule } from "@/lib/auth/can-access-module";
import { STOCK_ANALYSIS_ACCENT } from "@/config/modules";
import { loadStockAnalysisSummary } from "@/lib/dashboard/load-stock-analysis-summary";
import { ActivityBarChart } from "@/components/dashboard/ActivityBarChart";
import { ActivityStackedChart } from "@/components/dashboard/ActivityStackedChart";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { CompositionBreakdown } from "@/components/dashboard/CompositionBreakdown";
import { StatCard } from "@/components/dashboard/StatCard";
import { ModuleDashboardShell, ModuleQuickLinks } from "@/components/portal/ModuleDashboardShell";
import { StoreComparisonList } from "@/components/stock-analysis/StoreComparisonList";

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

  const statusChart = summary.dailyStatus.map((d) => ({
    label: d.label,
    success: d.success,
    error: d.error,
  }));

  return (
    <ModuleDashboardShell
      moduleId="stockAnalysis"
      title="Stock analysis dashboard"
      description="Catalog health over time from mismatch sweeps and Shopify sync outcomes. No live catalog fetch."
      kpi={
        <>
          <StatCard
            label="SKUs tracked"
            value={latest ? String(latest.totalItems) : "—"}
            hint={latest ? "Latest sweep" : "Run Find all mismatches"}
          />
          <StatCard
            label="Mismatched right now"
            value={latest ? String(latest.mismatched) : "—"}
            hint={latest ? sweepAgeHint(latest.capturedAt) : "No sweep yet"}
          />
          <StatCard
            label="Clean sync rate (14d)"
            value={summary.cleanSyncRate14d == null ? "—" : `${summary.cleanSyncRate14d}%`}
            hint="Success / (success + error)"
          />
          <StatCard
            label="Sync errors (14d)"
            value={String(summary.syncErrors14d)}
          />
        </>
      }
      charts={
        <>
          <ChartCard title="Mismatch trend" description="One bar per sweep, not per day">
            <ActivityBarChart
              data={summary.trend.map((p) => ({ label: p.label, value: p.value }))}
              fill={STOCK_ANALYSIS_ACCENT.chartFill}
              valueLabel="Mismatches"
              emptyMessage='Run "Find all mismatches" on the Balance page to start tracking this trend.'
            />
          </ChartCard>
          <ChartCard title="Sync outcomes (14d)" description="Combined-store success vs error per day">
            <ActivityStackedChart
              data={statusChart}
              successFill={STOCK_ANALYSIS_ACCENT.chartFill}
              emptyMessage="No sync activity in the last 14 days."
            />
          </ChartCard>
        </>
      }
    >
      {summary.error ? (
        <div className="rounded-card border border-[#C25151]/30 bg-[rgba(194,81,81,0.08)] px-4 py-3 text-[13px] text-[#C25151]">
          {summary.error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-line bg-white p-4 shadow-soft">
          <h2 className="text-[13px] font-medium text-ink">Catalog composition</h2>
          <p className="mt-0.5 text-[12px] text-muted">From the latest mismatch sweep</p>
          <div className="mt-3">
            <CompositionBreakdown
              segments={
                latest
                  ? [
                      { label: "Matched", count: latest.composition.matched },
                      { label: "Unlinked", count: latest.composition.unlinked },
                      { label: "Ambiguous", count: latest.composition.ambiguous },
                      { label: "Skipped", count: latest.composition.skipped },
                    ]
                  : []
              }
              emptyMessage='Run "Find all mismatches" on the Balance page to capture composition.'
            />
          </div>
        </div>

        <div className="rounded-card border border-line bg-white p-4 shadow-soft">
          <h2 className="text-[13px] font-medium text-ink">Store comparison — shared SKUs</h2>
          <p className="mt-0.5 text-[12px] text-muted">
            Top 10 by combined committed (Store A olive · Store B slate)
          </p>
          <div className="mt-3">
            {latest ? (
              <StoreComparisonList items={latest.storeComparison} />
            ) : (
              <p className="text-[13px] text-muted">
                Run &quot;Find all mismatches&quot; on the Balance page to capture store comparison.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-line bg-white p-4 shadow-soft">
          <h2 className="text-[13px] font-medium text-ink">Products needing attention</h2>
          <p className="mt-2 text-[13px] text-ink">
            {latest
              ? `${latest.composition.ambiguous} ambiguous, ${latest.composition.unlinked} unlinked`
              : "No sweep yet"}
          </p>
          <Link
            href="/stock-balance/errors"
            className="mt-3 inline-flex text-[13px] font-medium text-stock-analysis hover:underline"
          >
            View all in Errors
          </Link>
        </div>

        <div className="rounded-card border border-line bg-white p-4 shadow-soft">
          <h2 className="text-[13px] font-medium text-ink">Repeat errors (14d)</h2>
          <p className="mt-0.5 text-[12px] text-muted">Barcodes that failed more than once</p>
          {summary.repeatOffenders.length === 0 ? (
            <p className="mt-3 text-[13px] text-muted">No repeat sync failures in this window.</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {summary.repeatOffenders.map((row) => (
                <li
                  key={row.barcode}
                  className="flex items-center justify-between gap-3 text-[13px]"
                >
                  <span className="min-w-0 truncate font-mono text-ink">{row.barcode}</span>
                  <span className="shrink-0 font-mono tabular-nums text-muted">
                    {row.errorCount} errors
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ModuleQuickLinks
        moduleId="stockAnalysis"
        links={[
          { label: "Balance", href: "/stock-balance/balance", description: "Fix mismatches now" },
          { label: "Errors", href: "/stock-balance/errors", description: "Current problems" },
          { label: "Trends", href: "/stock-analysis/trends", description: "Deeper history" },
        ]}
      />
    </ModuleDashboardShell>
  );
}
