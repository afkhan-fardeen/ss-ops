import Link from "next/link";
import { canAccessModule } from "@/lib/auth/can-access-module";
import { SUBSCRIPTIONS_ACCENT } from "@/config/modules";
import { ActivityBarChart } from "@/components/dashboard/ActivityBarChart";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { ModuleDashboardShell, ModuleQuickLinks } from "@/components/portal/ModuleDashboardShell";
import { ModuleAccessDenied } from "@/components/portal/ModuleAccessDenied";
import { SubscriptionPipelineChart } from "@/components/subscriptions/SubscriptionPipelineChart";
import { SubscriptionSpendBreakdown } from "@/components/subscriptions/SubscriptionSpendBreakdown";
import { SubscriptionSpendPanel } from "@/components/subscriptions/SubscriptionSpendPanel";
import {
  formatCurrencyTotals,
  loadSubscriptionDashboardSummary,
} from "@/lib/subscriptions/load-dashboard-summary";
import {
  formatBillingCycle,
  formatMoney,
  formatSubscriptionType,
  paymentLast4,
} from "@/lib/subscriptions/constants";

export const dynamic = "force-dynamic";

function ageLabel(submittedAt: string): string {
  const submitted = new Date(submittedAt);
  submitted.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.max(
    0,
    Math.floor((today.getTime() - submitted.getTime()) / (24 * 60 * 60 * 1000)),
  );
  if (days === 0) return "Today";
  if (days === 1) return "1d";
  return `${days}d`;
}

export default async function SubscriptionsDashboardPage() {
  if (!(await canAccessModule("subscriptions"))) {
    return (
      <ModuleAccessDenied description="You need the Subscriptions module grant to view this dashboard." />
    );
  }

  const summary = await loadSubscriptionDashboardSummary();

  const pendingHint =
    summary.pending === 0
      ? "Inbox clear"
      : summary.oldestPendingDays == null
        ? "Needs action"
        : summary.oldestPendingDays === 0
          ? "Oldest today"
          : `Oldest ${summary.oldestPendingDays}d`;

  return (
    <ModuleDashboardShell
      moduleId="subscriptions"
      title="Subscriptions dashboard"
      description="Review pending requests, track monthly burn, and see which cards and entities carry spend."
      kpi={
        <>
          <StatCard
            label="Pending review"
            value={String(summary.pending)}
            hint={pendingHint}
          />
          <StatCard
            label="Active"
            value={String(summary.approved)}
            hint={`${summary.approvedLast30Days} approved in last 30d`}
          />
          <StatCard
            label="Est. monthly burn"
            value={formatCurrencyTotals(summary.spendAll.monthlyEquivalentByCurrency)}
            hint="Monthly + yearly ÷ 12"
          />
          <StatCard
            label="Annualized"
            value={formatCurrencyTotals(summary.spendAll.annualizedByCurrency)}
            hint={`${summary.rejected} rejected all-time`}
          />
        </>
      }
    >
      {/* Needs review */}
      <div className="overflow-hidden rounded-card border border-line bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <h3 className="text-body font-medium text-ink">Needs review</h3>
            <p className="text-body-sm text-muted">Pending requests · oldest first</p>
          </div>
          <Link
            href="/subscriptions"
            className="text-body-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        {summary.pendingQueue.length === 0 ? (
          <p className="px-4 py-8 text-center text-body text-muted">Inbox clear</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-body">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-caption uppercase tracking-wide max-md:normal-case max-md:tracking-normal text-muted">
                  <th className="px-4 py-3 font-medium">Ref</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Requester</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Cost</th>
                  <th className="px-4 py-3 font-medium">Last 4</th>
                  <th className="px-4 py-3 font-medium">Form date</th>
                  <th className="px-4 py-3 font-medium">Age</th>
                </tr>
              </thead>
              <tbody>
                {summary.pendingQueue.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-line last:border-0 hover:bg-canvas/40"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/subscriptions/${row.id}`}
                        className="font-mono text-body-sm font-medium text-primary hover:underline"
                      >
                        {row.reference_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-caption font-medium ${
                          row.subscription_type === "business"
                            ? "bg-primary-soft text-primary"
                            : "bg-canvas text-muted"
                        }`}
                      >
                        {formatSubscriptionType(row.subscription_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink">{row.employee_name}</td>
                    <td className="px-4 py-3 text-muted">{row.subscription_name}</td>
                    <td className="px-4 py-3 text-body-sm tabular-nums text-ink">
                      {formatMoney(Number(row.amount), row.currency)}
                      <span className="ml-1 text-caption text-muted">
                        / {formatBillingCycle(row.billing_cycle, row.billing_cycle_other)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-body-sm tabular-nums text-ink">
                      {paymentLast4(row.payment_method) ?? "—"}
                    </td>
                    <td className="tabular-nums px-4 py-3 text-caption text-muted">
                      {new Date(row.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="tabular-nums px-4 py-3 text-body-sm text-muted">
                      {ageLabel(row.submitted_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SubscriptionSpendPanel
        spendAll={summary.spendAll}
        spendEmployee={summary.spendEmployee}
        spendBusiness={summary.spendBusiness}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SubscriptionSpendBreakdown title="By card" rows={summary.spendByPayment} />
        <SubscriptionSpendBreakdown title="By entity billed" rows={summary.spendByEntity} />
        <SubscriptionSpendBreakdown
          title="Employee vs Business"
          rows={summary.spendByType}
        />
        <SubscriptionSpendBreakdown
          title="Top services"
          rows={summary.topServicesBySpend}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Pending age"
          description="How long requests have been waiting for review"
        >
          <ActivityBarChart
            data={summary.pendingAgeBuckets}
            fill={SUBSCRIPTIONS_ACCENT.chartFill}
            valueLabel="Pending"
            emptyMessage="No pending requests."
          />
        </ChartCard>
        <ChartCard
          title="Pipeline (14d)"
          description="Form submissions vs approvals per day"
        >
          <SubscriptionPipelineChart
            data={summary.pipelineByDay}
            submittedFill={SUBSCRIPTIONS_ACCENT.chartFill}
            approvedFill="#5B8A72"
          />
        </ChartCard>
      </div>

      {/* Recently approved */}
      <div className="overflow-hidden rounded-card border border-line bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <h3 className="text-body font-medium text-ink">Recently approved</h3>
            <p className="text-body-sm text-muted">Latest 5 active subscriptions</p>
          </div>
          <Link
            href="/subscriptions/active"
            className="text-body-sm font-medium text-primary hover:underline"
          >
            Active registry
          </Link>
        </div>
        {summary.recentApproved.length === 0 ? (
          <p className="px-4 py-8 text-center text-body text-muted">
            No approved subscriptions yet.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {summary.recentApproved.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/subscriptions/${row.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition hover:bg-canvas/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-body font-medium text-ink">
                      {row.subscription_name}
                    </p>
                    <p className="text-caption text-muted">
                      {row.employee_name}
                      {row.approved_at
                        ? ` · ${new Date(row.approved_at).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-body-sm tabular-nums text-ink">
                      {formatMoney(Number(row.amount), row.currency)}
                    </p>
                    <p className="tabular-nums text-caption text-muted">
                      {paymentLast4(row.payment_method) ?? "—"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
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
          className="inline-flex rounded-card border border-primary bg-primary px-4 py-2 text-body font-medium text-white transition hover:opacity-90"
        >
          Review {summary.pending} pending request{summary.pending === 1 ? "" : "s"}
        </Link>
      ) : (
        <Link
          href="/subscriptions/active"
          className="inline-flex rounded-card border border-primary bg-primary px-4 py-2 text-body font-medium text-white transition hover:opacity-90"
        >
          Open active subscriptions
        </Link>
      )}
    </ModuleDashboardShell>
  );
}
