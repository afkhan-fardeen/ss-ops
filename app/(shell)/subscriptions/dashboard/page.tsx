import Link from "next/link";
import { canAccessModule } from "@/lib/auth/can-access-module";
import { SUBSCRIPTIONS_ACCENT } from "@/config/modules";
import { ActivityBarChart } from "@/components/dashboard/ActivityBarChart";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { ModuleDashboardShell, ModuleQuickLinks } from "@/components/portal/ModuleDashboardShell";
import {
  formatCurrencyTotals,
  loadSubscriptionDashboardSummary,
} from "@/lib/subscriptions/load-dashboard-summary";
import {
  formatBillingCycle,
  formatMoney,
  STATUS_LABELS,
} from "@/lib/subscriptions/constants";

export const dynamic = "force-dynamic";

export default async function SubscriptionsDashboardPage() {
  if (!(await canAccessModule("subscriptions"))) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-line bg-white p-8 shadow-soft">
        <h1 className="text-lg font-medium text-ink">Access denied</h1>
        <p className="mt-2 text-[13px] text-muted">
          You need the Subscriptions module grant to view this dashboard.
        </p>
      </div>
    );
  }

  const summary = await loadSubscriptionDashboardSummary();
  const monthlyHint =
    summary.monthlyByCurrency.length > 0
      ? `${summary.monthlyByCurrency.reduce((n, r) => n + r.count, 0)} monthly plans`
      : "No monthly active plans";
  const yearlyHint =
    summary.yearlyByCurrency.length > 0
      ? `${summary.yearlyByCurrency.reduce((n, r) => n + r.count, 0)} annual plans`
      : "No annual active plans";

  return (
    <ModuleDashboardShell
      moduleId="subscriptions"
      title="Subscriptions dashboard"
      description="Pipeline health, active spend, and how company subscriptions are distributed."
      kpi={
        <>
          <StatCard
            label="Pending review"
            value={String(summary.pending)}
            hint={summary.pending > 0 ? "Needs action" : "Inbox clear"}
          />
          <StatCard
            label="Active"
            value={String(summary.approved)}
            hint={`${summary.approvedLast30Days} approved in last 30d`}
          />
          <StatCard
            label="Monthly spend"
            value={formatCurrencyTotals(summary.monthlyByCurrency)}
            hint={monthlyHint}
          />
          <StatCard
            label="Submitted (30d)"
            value={String(summary.submittedLast30Days)}
            hint={`${summary.rejected} rejected all-time`}
          />
        </>
      }
      charts={
        <>
          <ChartCard
            title="Submissions (14d)"
            description="New public form submissions per day"
          >
            <ActivityBarChart
              data={summary.submissionsByDay}
              fill={SUBSCRIPTIONS_ACCENT.chartFill}
              valueLabel="Requests"
              emptyMessage="No submissions in the last 14 days."
            />
          </ChartCard>
          <ChartCard title="Active by billing cycle" description="Approved subscriptions only">
            <ActivityBarChart
              data={summary.byBillingCycle}
              fill={SUBSCRIPTIONS_ACCENT.chartFill}
              valueLabel="Active"
              emptyMessage="No active subscriptions yet."
            />
          </ChartCard>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard title="Payment / card (last 4)" rows={summary.byPaymentMethod} />
        <BreakdownCard title="Entity billed" rows={summary.byEntity} />
        <BreakdownCard title="Top services" rows={summary.topServices} />
        <div className="rounded-card border border-line bg-white p-5 shadow-soft">
          <h3 className="text-[13px] font-medium text-ink">Annual spend</h3>
          <p className="mt-1 text-[12px] text-muted">{yearlyHint}</p>
          <p className="mt-3 font-mono text-xl font-medium tabular-nums text-ink">
            {formatCurrencyTotals(summary.yearlyByCurrency)}
          </p>
          {summary.yearlyByCurrency.length > 0 ? (
            <ul className="mt-3 space-y-1.5 text-[12px] text-muted">
              {summary.yearlyByCurrency.map((r) => (
                <li key={r.currency} className="flex justify-between gap-3">
                  <span>
                    {r.count} plan{r.count === 1 ? "" : "s"} · {r.currency}
                  </span>
                  <span className="font-mono text-ink">{formatMoney(r.total, r.currency)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="rounded-card border border-line bg-white shadow-soft overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 className="text-[13px] font-medium text-ink">Recent requests</h3>
          <Link
            href="/subscriptions"
            className="text-[12px] font-medium text-subscriptions hover:underline"
          >
            View all
          </Link>
        </div>
        {summary.recent.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-muted">No requests yet.</p>
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line bg-canvas/60 text-[11px] uppercase tracking-wider text-muted">
                <th className="px-4 py-2.5 font-medium">Ref</th>
                <th className="px-4 py-2.5 font-medium">Employee</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Service</th>
                <th className="hidden px-4 py-2.5 font-medium lg:table-cell">Payment</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Cost</th>
              </tr>
            </thead>
            <tbody>
              {summary.recent.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0 hover:bg-canvas/40">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/subscriptions/${row.id}`}
                      className="font-mono text-[12px] font-medium text-subscriptions hover:underline"
                    >
                      {row.reference_number}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-ink">{row.employee_name}</td>
                  <td className="hidden px-4 py-2.5 text-muted sm:table-cell">
                    {row.subscription_name}
                  </td>
                  <td className="hidden px-4 py-2.5 text-[12px] text-ink lg:table-cell">
                    {row.payment_method ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        row.status === "pending"
                          ? "bg-gold/10 text-gold"
                          : row.status === "approved"
                            ? "bg-cod-bg text-cod"
                            : "bg-fulfillment/10 text-fulfillment"
                      }`}
                    >
                      {STATUS_LABELS[row.status]}
                    </span>
                  </td>
                  <td className="hidden px-4 py-2.5 font-mono text-[12px] tabular-nums text-muted md:table-cell">
                    {formatMoney(Number(row.amount), row.currency)}
                    <span className="ml-1 text-[10px]">
                      / {formatBillingCycle(row.billing_cycle, row.billing_cycle_other)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ModuleQuickLinks
        moduleId="subscriptions"
        links={[
          {
            label: "Requests",
            href: "/subscriptions",
            description: "Review pending, approved, and rejected forms",
          },
          {
            label: "Active",
            href: "/subscriptions/active",
            description: "Live company subscription registry",
          },
          {
            label: "Public form",
            href: "/subscriptions/request",
            description: "Open the employee request form",
          },
        ]}
      />

      {summary.pending > 0 ? (
        <Link
          href="/subscriptions"
          className="inline-flex rounded-card border border-subscriptions bg-subscriptions px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90"
        >
          Review {summary.pending} pending request{summary.pending === 1 ? "" : "s"}
        </Link>
      ) : (
        <Link
          href="/subscriptions/active"
          className="inline-flex rounded-card border border-subscriptions bg-subscriptions px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90"
        >
          Open active subscriptions
        </Link>
      )}
    </ModuleDashboardShell>
  );
}

function BreakdownCard({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number }[];
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="rounded-card border border-line bg-white p-5 shadow-soft">
      <h3 className="text-[13px] font-medium text-ink">{title}</h3>
      <p className="mt-0.5 text-[12px] text-muted">Among active subscriptions</p>
      {rows.length === 0 ? (
        <p className="mt-6 text-center text-[12px] text-muted">No data yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-[12px]">
                <span className="truncate text-ink">{r.label}</span>
                <span className="shrink-0 font-mono tabular-nums text-muted">{r.value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
                <div
                  className="h-full rounded-full bg-subscriptions"
                  style={{ width: `${Math.max(8, (r.value / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
