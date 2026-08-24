import Link from "next/link";
import { canAccessModule } from "@/lib/auth/can-access-module";
import { loadStockRestockActivity } from "@/lib/dashboard/load-stock-restock-activity";
import { STOCK_ACCENT } from "@/config/modules";
import { ActivityBarChart } from "@/components/dashboard/ActivityBarChart";
import { ActivityStackedChart } from "@/components/dashboard/ActivityStackedChart";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { ModuleDashboardShell, ModuleQuickLinks } from "@/components/portal/ModuleDashboardShell";

export const dynamic = "force-dynamic";

export default async function StockBalanceDashboardPage() {
  if (!(await canAccessModule("stock"))) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-line bg-white p-8 shadow-soft">
        <h1 className="text-lg font-medium text-ink">Access denied</h1>
        <p className="mt-2 text-[13px] text-muted">
          Stock balance is only available to admins or users granted the Stock Balance module.
        </p>
      </div>
    );
  }

  const activity = await loadStockRestockActivity(14);

  const lastLabel = activity.lastRestockAt
    ? new Date(activity.lastRestockAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Never";

  const restocksChart = activity.dailyRestocks.map((d) => ({ label: d.label, value: d.count }));
  const statusChart = activity.dailyStatus.map((d) => ({
    label: d.label,
    success: d.success,
    error: d.error,
  }));

  return (
    <ModuleDashboardShell
      moduleId="stock"
      title="Stock balance dashboard"
      description="Search Ubex inventory, compare available-to-sell across International Store and Seissense GCC Store, and sync both stores."
      kpi={
        <>
          <StatCard label="Last successful restock" value={lastLabel} />
          <StatCard label="Restocks (7d)" value={String(activity.restocksLast7Days)} />
          <StatCard label="Restocks (14d)" value={String(activity.restocksLast14Days)} />
          <StatCard
            label="Errors (14d)"
            value={String(activity.dailyStatus.reduce((s, d) => s + d.error, 0))}
          />
        </>
      }
      charts={
        <>
          <ChartCard title="Restocks per day" description="Successful Shopify inventory updates">
            <ActivityBarChart
              data={restocksChart}
              fill={STOCK_ACCENT.chartFill}
              valueLabel="Restocks"
              emptyMessage="No restocks in the last 14 days."
            />
          </ChartCard>
          <ChartCard title="Restock outcomes" description="Success vs error per day">
            <ActivityStackedChart
              data={statusChart}
              successFill={STOCK_ACCENT.chartFill}
              emptyMessage="No restock activity yet."
            />
          </ChartCard>
        </>
      }
    >
      <ModuleQuickLinks
        moduleId="stock"
        links={[
          { label: "Balance", href: "/stock-balance/balance", description: "Compare and restock" },
          { label: "History", href: "/stock-balance/history", description: "Past restock actions" },
          { label: "Settings", href: "/stock-balance/settings", description: "Catalog limits" },
        ]}
      />
      <Link
        href="/stock-balance/balance"
        className="inline-flex rounded-card border border-stock bg-stock px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90"
      >
        Open stock balance
      </Link>
    </ModuleDashboardShell>
  );
}
