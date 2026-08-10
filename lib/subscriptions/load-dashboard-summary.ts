import { listSubscriptionRequests } from "@/lib/subscriptions/db";
import type { SubscriptionRequestRow } from "@/lib/subscriptions/types";
import { formatBillingCycle, formatMoney, paymentLabel } from "@/lib/subscriptions/constants";

export type SubscriptionDashboardSummary = {
  pending: number;
  approved: number;
  rejected: number;
  submittedLast30Days: number;
  approvedLast30Days: number;
  /** Active monthly totals grouped by currency */
  monthlyByCurrency: { currency: string; total: number; count: number }[];
  /** Active yearly totals grouped by currency */
  yearlyByCurrency: { currency: string; total: number; count: number }[];
  byPaymentMethod: { label: string; value: number }[];
  byEntity: { label: string; value: number }[];
  byBillingCycle: { label: string; value: number }[];
  topServices: { label: string; value: number }[];
  recent: SubscriptionRequestRow[];
  submissionsByDay: { label: string; value: number }[];
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function shortDayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function bump(
  map: Map<string, number>,
  key: string,
  by = 1,
) {
  map.set(key, (map.get(key) ?? 0) + by);
}

function moneyBump(
  map: Map<string, { total: number; count: number }>,
  currency: string,
  amount: number,
) {
  const cur = map.get(currency) ?? { total: 0, count: 0 };
  cur.total += amount;
  cur.count += 1;
  map.set(currency, cur);
}

function topEntries(map: Map<string, number>, limit: number) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

export async function loadSubscriptionDashboardSummary(): Promise<SubscriptionDashboardSummary> {
  const rows = await listSubscriptionRequests("all");
  const since30 = daysAgo(30);
  const since14 = daysAgo(13); // inclusive 14 days

  let pending = 0;
  let approved = 0;
  let rejected = 0;
  let submittedLast30Days = 0;
  let approvedLast30Days = 0;

  const monthlyMoney = new Map<string, { total: number; count: number }>();
  const yearlyMoney = new Map<string, { total: number; count: number }>();
  const paymentMap = new Map<string, number>();
  const entityMap = new Map<string, number>();
  const cycleMap = new Map<string, number>();
  const serviceMap = new Map<string, number>();
  const dayMap = new Map<string, number>();

  // Seed last 14 days so chart has continuous labels
  for (let i = 13; i >= 0; i--) {
    const d = daysAgo(i);
    dayMap.set(shortDayLabel(d), 0);
  }

  for (const row of rows) {
    if (row.status === "pending") pending += 1;
    if (row.status === "approved") approved += 1;
    if (row.status === "rejected") rejected += 1;

    const submitted = new Date(row.submitted_at);
    if (submitted >= since30) submittedLast30Days += 1;

    if (row.status === "approved" && row.approved_at) {
      const approvedAt = new Date(row.approved_at);
      if (approvedAt >= since30) approvedLast30Days += 1;
    }

    if (submitted >= since14) {
      bump(dayMap, shortDayLabel(submitted));
    }

    if (row.status === "approved") {
      const amount = Number(row.amount) || 0;
      if (row.billing_cycle === "monthly") {
        moneyBump(monthlyMoney, row.currency || "USD", amount);
      } else if (row.billing_cycle === "yearly") {
        moneyBump(yearlyMoney, row.currency || "USD", amount);
      }

      bump(paymentMap, paymentLabel(row.payment_method) || "Unspecified");
      bump(entityMap, row.entity_billed || "Unspecified");
      bump(
        cycleMap,
        formatBillingCycle(row.billing_cycle, row.billing_cycle_other),
      );
      bump(serviceMap, row.subscription_name || "Unknown");
    }
  }

  return {
    pending,
    approved,
    rejected,
    submittedLast30Days,
    approvedLast30Days,
    monthlyByCurrency: [...monthlyMoney.entries()]
      .map(([currency, v]) => ({ currency, total: v.total, count: v.count }))
      .sort((a, b) => b.total - a.total),
    yearlyByCurrency: [...yearlyMoney.entries()]
      .map(([currency, v]) => ({ currency, total: v.total, count: v.count }))
      .sort((a, b) => b.total - a.total),
    byPaymentMethod: topEntries(paymentMap, 8),
    byEntity: topEntries(entityMap, 8),
    byBillingCycle: topEntries(cycleMap, 6),
    topServices: topEntries(serviceMap, 6),
    recent: rows.slice(0, 8),
    submissionsByDay: [...dayMap.entries()].map(([label, value]) => ({ label, value })),
  };
}

export function formatCurrencyTotals(
  rows: { currency: string; total: number; count: number }[],
): string {
  if (rows.length === 0) return "—";
  return rows.map((r) => formatMoney(r.total, r.currency)).join(" · ");
}
