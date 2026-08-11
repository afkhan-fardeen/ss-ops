"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { SubscriptionRequestRow, SubscriptionType } from "@/lib/subscriptions/types";
import {
  formatBillingCycle,
  formatMoney,
  formatSubscriptionType,
  paymentLabel,
  paymentLast4,
  STATUS_LABELS,
} from "@/lib/subscriptions/constants";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
] as const;

const TYPE_FILTERS = [
  { key: "all", label: "All types" },
  { key: "employee", label: "Employee" },
  { key: "business", label: "Business" },
] as const;

type TabKey = (typeof TABS)[number]["key"];
type TypeFilterKey = (typeof TYPE_FILTERS)[number]["key"];

export function SubscriptionsListView({
  rows,
  publicFormUrl,
}: {
  rows: SubscriptionRequestRow[];
  publicFormUrl: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = (searchParams.get("status") as TabKey) || "pending";
  const typeFilter = (searchParams.get("type") as TypeFilterKey) || "all";
  const [copied, setCopied] = useState(false);

  const filteredRows = useMemo(() => {
    if (typeFilter === "all") return rows;
    return rows.filter((row) => row.subscription_type === typeFilter);
  }, [rows, typeFilter]);

  function setTab(key: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "pending") params.delete("status");
    else params.set("status", key);
    router.push(`/subscriptions?${params.toString()}`);
  }

  function setTypeFilter(key: TypeFilterKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "all") params.delete("type");
    else params.set("type", key);
    router.push(`/subscriptions?${params.toString()}`);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicFormUrl);
      setCopied(true);
      toast.success("Public form link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTab(tab.key)}
              className={[
                "rounded-full px-3 py-1.5 text-[12px] font-medium transition",
                active === tab.key
                  ? "bg-subscriptions-bg text-subscriptions"
                  : "border border-line bg-white text-muted hover:text-ink",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-card border border-line bg-white px-3 text-[13px] font-medium text-ink transition hover:bg-canvas"
          >
            <Copy size={14} />
            {copied ? "Copied" : "Copy public link"}
          </button>
          <a
            href={publicFormUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-card border border-line bg-white px-3 text-[13px] font-medium text-ink transition hover:bg-canvas"
          >
            <ExternalLink size={14} />
            Open form
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setTypeFilter(filter.key)}
            className={[
              "rounded-full px-3 py-1 text-[11px] font-medium transition",
              typeFilter === filter.key
                ? "bg-ink text-white"
                : "border border-line bg-white text-muted hover:text-ink",
            ].join(" ")}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-card border border-line bg-white shadow-soft">
        <table className="w-full min-w-[820px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line bg-canvas/60 text-[11px] uppercase tracking-wider text-muted">
              <th className="px-4 py-2.5 font-medium">Reference</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Employee</th>
              <th className="px-4 py-2.5 font-medium">Subscription</th>
              <th className="px-4 py-2.5 font-medium">Cost</th>
              <th className="px-4 py-2.5 font-medium">Cycle</th>
              <th className="px-4 py-2.5 font-medium">Payment</th>
              <th className="px-4 py-2.5 font-medium">Last 4</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Form date</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-muted">
                  No requests in this view.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0 hover:bg-canvas/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/subscriptions/${row.id}`}
                      className="font-mono text-[12px] font-medium text-subscriptions hover:underline"
                    >
                      {row.reference_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={row.subscription_type} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{row.employee_name}</div>
                    <div className="text-[11px] text-muted">{row.employee_email}</div>
                  </td>
                  <td className="px-4 py-3 text-ink">{row.subscription_name}</td>
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
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
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

function StatusBadge({ status }: { status: SubscriptionRequestRow["status"] }) {
  const styles = {
    pending: "bg-gold/10 text-gold",
    approved: "bg-cod-bg text-cod",
    rejected: "bg-fulfillment/10 text-fulfillment",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function TypeBadge({ type }: { type: SubscriptionType }) {
  const styles =
    type === "business"
      ? "bg-subscriptions-bg text-subscriptions"
      : "bg-canvas text-muted";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${styles}`}>
      {formatSubscriptionType(type)}
    </span>
  );
}