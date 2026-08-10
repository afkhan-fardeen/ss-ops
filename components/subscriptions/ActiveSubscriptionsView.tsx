import Link from "next/link";
import type { SubscriptionRequestRow } from "@/lib/subscriptions/types";
import {
  formatBillingCycle,
  formatMoney,
  paymentLabel,
  paymentLast4,
} from "@/lib/subscriptions/constants";

export function ActiveSubscriptionsView({ rows }: { rows: SubscriptionRequestRow[] }) {
  const totalMonthly = rows
    .filter((r) => r.billing_cycle === "monthly")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-line bg-white p-4 shadow-soft">
        <p className="text-[12px] text-muted">Active subscriptions</p>
        <p className="font-mono text-2xl font-medium tabular-nums text-ink">{rows.length}</p>
        {totalMonthly > 0 ? (
          <p className="mt-1 text-[12px] text-muted">
            ~USD {totalMonthly.toFixed(2)} / month (monthly plans only; mixed currencies not summed)
          </p>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-card border border-line bg-white shadow-soft">
        <table className="w-full min-w-[800px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line bg-canvas/60 text-[11px] uppercase tracking-wider text-muted">
              <th className="px-4 py-2.5 font-medium">Employee</th>
              <th className="px-4 py-2.5 font-medium">Subscription</th>
              <th className="px-4 py-2.5 font-medium">Amount</th>
              <th className="px-4 py-2.5 font-medium">Cycle</th>
              <th className="px-4 py-2.5 font-medium">Payment</th>
              <th className="px-4 py-2.5 font-medium">Last 4</th>
              <th className="px-4 py-2.5 font-medium">Approved by</th>
              <th className="px-4 py-2.5 font-medium">Form date</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  No active subscriptions yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0 hover:bg-canvas/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/subscriptions/${row.id}`}
                      className="font-medium text-ink hover:text-subscriptions"
                    >
                      {row.employee_name}
                    </Link>
                    <div className="text-[11px] text-muted">{row.department ?? row.employee_email}</div>
                  </td>
                  <td className="px-4 py-3">{row.subscription_name}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">
                    {formatMoney(Number(row.amount), row.currency)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatBillingCycle(row.billing_cycle, row.billing_cycle_other)}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-ink">
                    {paymentLabel(row.payment_method)}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-ink">
                    {paymentLast4(row.payment_method) ?? "—"}
                  </td>
                  <td className="px-4 py-3">{row.approved_by_name ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted">
                    {new Date(row.submitted_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
