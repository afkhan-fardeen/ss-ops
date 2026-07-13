import Link from "next/link";
import { loadFulfillmentActivity } from "@/lib/dashboard/load-fulfillment-activity";
import { FULFILLMENT_ACCENT } from "@/config/modules";
import { ActivityBarChart } from "@/components/dashboard/ActivityBarChart";
import { ActivityStackedChart } from "@/components/dashboard/ActivityStackedChart";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { CronStatus } from "@/components/sync/CronStatus";
import { ModuleDashboardShell, ModuleQuickLinks } from "@/components/portal/ModuleDashboardShell";

export const dynamic = "force-dynamic";

export default async function FulfillmentDashboardPage() {
  const activity = await loadFulfillmentActivity(14);

  const pushesChart = activity.dailyPushes.map((d) => ({ label: d.label, value: d.count }));
  const statusChart = activity.dailyStatus.map((d) => ({
    label: d.label,
    success: d.success,
    error: d.error,
  }));

  return (
    <ModuleDashboardShell
      moduleId="fulfillment"
      title="Fulfillment dashboard"
      description="Push Ubex tracking to Shopify and review fulfillment history."
      kpi={
        <>
          <StatCard label="Pushes (7d)" value={String(activity.pushesLast7Days)} />
          <StatCard label="Pushes (14d)" value={String(activity.pushesLast14Days)} />
          <StatCard
            label="Success rate (14d)"
            value={
              activity.successRate14d != null ? `${activity.successRate14d}%` : "—"
            }
          />
          <StatCard label="Errors (14d)" value={String(
            activity.dailyStatus.reduce((s, d) => s + d.error, 0),
          )} />
        </>
      }
      charts={
        <>
          <ChartCard title="Fulfillment pushes per day">
            <ActivityBarChart
              data={pushesChart}
              fill={FULFILLMENT_ACCENT.chartFill}
              valueLabel="Pushes"
              emptyMessage="No fulfillment pushes in the last 14 days."
            />
          </ChartCard>
          <ChartCard title="Push outcomes" description="Success vs error per day">
            <ActivityStackedChart
              data={statusChart}
              successFill={FULFILLMENT_ACCENT.chartFill}
              emptyMessage="No fulfillment activity yet."
            />
          </ChartCard>
        </>
      }
    >
      <div className="rounded-card border border-line bg-white p-4 shadow-soft">
        <h2 className="text-[13px] font-medium text-ink">Auto-fulfill cron</h2>
        <p className="mt-1 text-[12px] text-muted">Recent scheduled sync runs</p>
        <div className="mt-3">
          <CronStatus />
        </div>
      </div>
      <ModuleQuickLinks
        moduleId="fulfillment"
        links={[
          { label: "Fulfillment list", href: "/fulfillment/list", description: "Today's queue" },
          { label: "History", href: "/fulfillment/history", description: "Past pushes" },
          { label: "Settings", href: "/fulfillment/settings", description: "Tracking options" },
        ]}
      />
      <Link
        href="/fulfillment/list"
        className="inline-flex rounded-card border border-fulfillment bg-fulfillment px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90"
      >
        Open fulfillment list
      </Link>
    </ModuleDashboardShell>
  );
}
