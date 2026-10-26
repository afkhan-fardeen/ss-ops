"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import type { SubscriptionRequestRow, SubscriptionType } from "@/lib/subscriptions/types";
import {
  formatBillingCycle,
  formatMoney,
  formatSubscriptionType,
  paymentLabel,
  paymentLast4,
} from "@/lib/subscriptions/constants";

const TYPE_FILTERS = [
  { key: "all", label: "All types" },
  { key: "employee", label: "Employee" },
  { key: "business", label: "Business" },
] as const;

type TypeFilterKey = (typeof TYPE_FILTERS)[number]["key"];

export function ActiveSubscriptionsView({ rows }: { rows: SubscriptionRequestRow[] }) {
  const [typeFilter, setTypeFilter] = useState<TypeFilterKey>("all");

  const filteredRows = useMemo(() => {
    if (typeFilter === "all") return rows;
    return rows.filter((row) => row.subscription_type === typeFilter);
  }, [rows, typeFilter]);

  const totalMonthly = filteredRows
    .filter((r) => r.billing_cycle === "monthly")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-line bg-white p-4 shadow-soft">
        <p className="text-body-sm text-muted">Active subscriptions</p>
        <p className="text-display font-medium tabular-nums text-ink">
          {filteredRows.length}
        </p>
        {totalMonthly > 0 ? (
          <p className="mt-1 text-body-sm text-muted">
            ~USD {totalMonthly.toFixed(2)} / month (monthly plans only; mixed currencies not summed)
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setTypeFilter(filter.key)}
            className={[
              "min-h-10 shrink-0 rounded-full px-4 text-body font-medium transition md:min-h-0 md:px-3 md:py-1 md:text-body-sm",
              typeFilter === filter.key
                ? "bg-ink text-white"
                : "border border-line bg-white text-muted hover:text-ink",
            ].join(" ")}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <ul className="space-y-3 md:hidden">
        {filteredRows.length === 0 ? (
          <li className="rounded-card border border-line bg-white p-6 text-center text-body-lg text-muted shadow-soft">
            No active subscriptions yet.
          </li>
        ) : (
          filteredRows.map((row) => (
            <li key={row.id} className="rounded-card border border-line bg-white p-4 shadow-soft">
              <Link href={`/subscriptions/${row.id}`} className="block">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-body-lg font-semibold text-ink">{row.subscription_name}</p>
                    <p className="truncate text-body text-muted">{row.employee_name}</p>
                  </div>
                  <TypeBadge type={row.subscription_type} />
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-heading font-semibold tabular-nums text-ink">
                      {formatMoney(Number(row.amount), row.currency)}
                    </p>
                    <p className="text-body text-muted">
                      {formatBillingCycle(row.billing_cycle, row.billing_cycle_other)}
                      {paymentLast4(row.payment_method) ? ` · •••• ${paymentLast4(row.payment_method)}` : ""}
                    </p>
                  </div>
                  <p className="text-body-sm text-muted">
                    {row.approved_by_name ? `Approved by ${row.approved_by_name}` : ""}
                  </p>
                </div>
              </Link>
              <a
                href={`/api/subscriptions/${row.id}/pdf?download=1`}
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-control border border-line px-3 text-body font-medium text-ink active:bg-canvas"
              >
                <Download size={16} />
                Download PDF
              </a>
            </li>
          ))
        )}
      </ul>

      <div className="hidden overflow-x-auto rounded-card border border-line bg-white shadow-soft md:block">
        <table className="w-full min-w-[940px] text-left text-body">
          <thead>
            <tr className="border-b border-line bg-canvas/60 text-caption uppercase tracking-wide max-md:normal-case max-md:tracking-normal text-muted">
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Subscription</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Cycle</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Last 4</th>
              <th className="px-4 py-3 font-medium">Approved by</th>
              <th className="px-4 py-3 font-medium">Form date</th>
              <th className="px-4 py-3 font-medium">PDF</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-muted">
                  No active subscriptions yet.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0 hover:bg-canvas/40">
                  <td className="px-4 py-3">
                    <TypeBadge type={row.subscription_type} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/subscriptions/${row.id}`}
                      className="font-medium text-ink hover:text-primary"
                    >
                      {row.employee_name}
                    </Link>
                    <div className="text-caption text-muted">
                      {row.department ?? row.employee_email}
                    </div>
                  </td>
                  <td className="px-4 py-3">{row.subscription_name}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatMoney(Number(row.amount), row.currency)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatBillingCycle(row.billing_cycle, row.billing_cycle_other)}
                  </td>
                  <td className="px-4 py-3 text-body-sm text-ink">
                    {paymentLabel(row.payment_method)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink">
                    {paymentLast4(row.payment_method) ?? "—"}
                  </td>
                  <td className="px-4 py-3">{row.approved_by_name ?? "—"}</td>
                  <td className="tabular-nums px-4 py-3 text-caption text-muted">
                    {new Date(row.submitted_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/api/subscriptions/${row.id}/pdf?download=1`}
                      className="inline-flex items-center gap-2 rounded-card border border-line bg-white px-3 py-2 text-body-sm font-medium text-ink transition hover:bg-canvas"
                      title={`Download ${row.reference_number}.pdf`}
                    >
                      <Download size={14} />
                      PDF
                    </a>
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

function TypeBadge({ type }: { type: SubscriptionType }) {
  const styles =
    type === "business"
      ? "bg-primary-soft text-primary"
      : "bg-canvas text-muted";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-caption font-medium ${styles}`}>
      {formatSubscriptionType(type)}
    </span>
  );
}
