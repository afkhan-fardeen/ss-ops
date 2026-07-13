import Link from "next/link";
import { getLastNWindows, shortWindowLabel } from "@/lib/datetime/collection-window";
import { loadCodEmailActivity } from "@/lib/dashboard/load-cod-email-activity";
import { COD_ACCENT } from "@/config/modules";
import { ActivityBarChart } from "@/components/dashboard/ActivityBarChart";
import { ActivityStackedChart } from "@/components/dashboard/ActivityStackedChart";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { ModuleDashboardShell, ModuleQuickLinks } from "@/components/portal/ModuleDashboardShell";

export const dynamic = "force-dynamic";

export default async function CodDashboardPage() {
  const todayWindow = getLastNWindows(1)[0];
  const activity = await loadCodEmailActivity(14);

  const lastEmailLabel =
    activity.lastSentAt && activity.lastOrderCount != null
      ? `${activity.lastOrderCount} orders · ${new Date(activity.lastSentAt).toLocaleDateString()}`
      : "None sent yet";

  const ordersChart = activity.dailyOrders.map((d) => ({ label: d.label, value: d.count }));
  const statusChart = activity.dailyStatus.map((d) => ({
    label: d.label,
    success: d.success,
    error: d.error,
  }));

  return (
    <ModuleDashboardShell
      moduleId="cod"
      title="COD dashboard"
      description="Collection windows, order list, email history, and recipient settings."
      kpi={
        <>
          <StatCard
            label="Current window"
            value={todayWindow ? shortWindowLabel(todayWindow) : "—"}
          />
          <StatCard label="Last COD email" value={lastEmailLabel} />
          <StatCard label="Emails sent (14d)" value={String(activity.emailsLast14Days)} />
          <StatCard
            label="Orders emailed (14d)"
            value={String(activity.ordersEmailedLast14Days)}
          />
        </>
      }
      charts={
        <>
          <ChartCard title="Orders per day" description="Total COD orders in emails sent">
            <ActivityBarChart
              data={ordersChart}
              fill={COD_ACCENT.chartFill}
              valueLabel="Orders"
              emptyMessage="No COD emails sent in the last 14 days."
            />
          </ChartCard>
          <ChartCard title="Email sends" description="Success vs error per day">
            <ActivityStackedChart
              data={statusChart}
              successFill={COD_ACCENT.chartFill}
              emptyMessage="No COD email activity yet."
            />
          </ChartCard>
        </>
      }
    >
      <ModuleQuickLinks
        moduleId="cod"
        links={[
          { label: "COD List", href: "/cod/list", description: "View and export COD orders" },
          { label: "History", href: "/cod/history", description: "Past COD email sends" },
          { label: "Settings", href: "/cod/settings", description: "Email recipients" },
        ]}
      />
      <Link
        href="/cod/list"
        className="inline-flex rounded-card border border-cod bg-cod px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90"
      >
        Open COD List
      </Link>
    </ModuleDashboardShell>
  );
}
