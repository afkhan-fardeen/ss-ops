import { listSubscriptionRequests } from "@/lib/subscriptions/db";
import type { BillingCycle, SubscriptionRequestRow } from "@/lib/subscriptions/types";
import {
  formatMoney,
  formatSubscriptionType,
  paymentLabel,
  paymentLast4,
} from "@/lib/subscriptions/constants";

export type CurrencyTotal = { currency: string; total: number; count: number };

export type SpendBreakdownRow = {
  label: string;
  count: number;
  /** Monthly-equivalent totals by currency (for bar width / display). */
  totals: CurrencyTotal[];
  /** Sum of monthly-equivalent across currencies (proxy only; mixed FX). */
  monthlyEquivalentProxy: number;
};

export type SpendSlice = {
  monthlyEquivalentByCurrency: CurrencyTotal[];
  annualizedByCurrency: CurrencyTotal[];
};

export type SubscriptionDashboardSummary = {
  pending: number;
  approved: number;
  rejected: number;
  approvedLast30Days: number;
  oldestPendingDays: number | null;
  pendingQueue: SubscriptionRequestRow[];
  spendAll: SpendSlice;
  spendEmployee: SpendSlice;
  spendBusiness: SpendSlice;
  spendByPayment: SpendBreakdownRow[];
  spendByEntity: SpendBreakdownRow[];
  spendByType: SpendBreakdownRow[];
  topServicesBySpend: SpendBreakdownRow[];
  pendingAgeBuckets: { label: string; value: number }[];
  pipelineByDay: { label: string; submitted: number; approved: number }[];
  recentApproved: SubscriptionRequestRow[];
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function shortDayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Monthly burn contribution; yearly÷12; one-time/other → 0. */
export function toMonthlyEquivalent(amount: number, cycle: BillingCycle): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (cycle === "monthly") return amount;
  if (cycle === "yearly") return amount / 12;
  return 0;
}

/** Annualized run-rate; monthly×12 + yearly; one-time/other → 0. */
export function toAnnualized(amount: number, cycle: BillingCycle): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (cycle === "monthly") return amount * 12;
  if (cycle === "yearly") return amount;
  return 0;
}

function moneyBump(
  map: Map<string, { total: number; count: number }>,
  currency: string,
  amount: number,
) {
  if (!Number.isFinite(amount) || amount === 0) return;
  const cur = map.get(currency) ?? { total: 0, count: 0 };
  cur.total += amount;
  cur.count += 1;
  map.set(currency, cur);
}

function mapToCurrencyTotals(map: Map<string, { total: number; count: number }>): CurrencyTotal[] {
  return [...map.entries()]
    .map(([currency, v]) => ({ currency, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total);
}

function emptySlice(): SpendSlice {
  return { monthlyEquivalentByCurrency: [], annualizedByCurrency: [] };
}

function buildSpendSlice(rows: SubscriptionRequestRow[]): SpendSlice {
  const monthly = new Map<string, { total: number; count: number }>();
  const annual = new Map<string, { total: number; count: number }>();
  for (const row of rows) {
    const amount = Number(row.amount) || 0;
    const currency = row.currency || "USD";
    const m = toMonthlyEquivalent(amount, row.billing_cycle);
    const a = toAnnualized(amount, row.billing_cycle);
    if (m > 0) moneyBump(monthly, currency, m);
    if (a > 0) moneyBump(annual, currency, a);
  }
  return {
    monthlyEquivalentByCurrency: mapToCurrencyTotals(monthly),
    annualizedByCurrency: mapToCurrencyTotals(annual),
  };
}

type BucketAcc = {
  count: number;
  money: Map<string, { total: number; count: number }>;
  proxy: number;
};

function bumpSpendBucket(buckets: Map<string, BucketAcc>, label: string, row: SubscriptionRequestRow) {
  const amount = Number(row.amount) || 0;
  const currency = row.currency || "USD";
  const monthlyEq = toMonthlyEquivalent(amount, row.billing_cycle);
  let acc = buckets.get(label);
  if (!acc) {
    acc = { count: 0, money: new Map(), proxy: 0 };
    buckets.set(label, acc);
  }
  acc.count += 1;
  acc.proxy += monthlyEq;
  if (monthlyEq > 0) moneyBump(acc.money, currency, monthlyEq);
}

function finalizeSpendBuckets(buckets: Map<string, BucketAcc>, limit: number): SpendBreakdownRow[] {
  return [...buckets.entries()]
    .map(([label, acc]) => ({
      label,
      count: acc.count,
      totals: mapToCurrencyTotals(acc.money),
      monthlyEquivalentProxy: acc.proxy,
    }))
    .sort((a, b) => b.monthlyEquivalentProxy - a.monthlyEquivalentProxy || b.count - a.count)
    .slice(0, limit);
}

function paymentSpendLabel(paymentMethod: string | null | undefined): string {
  const name = paymentLabel(paymentMethod);
  if (name === "—") return "Unspecified";
  const last4 = paymentLast4(paymentMethod);
  return last4 ? `${name} · ${last4}` : name;
}

function pendingAgeDays(submittedAt: string, now: Date): number {
  const submitted = startOfDay(new Date(submittedAt));
  const today = startOfDay(now);
  const ms = today.getTime() - submitted.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

export async function loadSubscriptionDashboardSummary(): Promise<SubscriptionDashboardSummary> {
  const rows = await listSubscriptionRequests("all");
  const now = new Date();
  const since30 = daysAgo(30);
  const since14 = daysAgo(13);

  let pending = 0;
  let approved = 0;
  let rejected = 0;
  let approvedLast30Days = 0;
  let oldestPendingDays: number | null = null;

  const pendingRows: SubscriptionRequestRow[] = [];
  const approvedRows: SubscriptionRequestRow[] = [];

  const paymentBuckets = new Map<string, BucketAcc>();
  const entityBuckets = new Map<string, BucketAcc>();
  const typeBuckets = new Map<string, BucketAcc>();
  const serviceBuckets = new Map<string, BucketAcc>();

  const ageBuckets = {
    "0–3d": 0,
    "4–7d": 0,
    "8–14d": 0,
    "15d+": 0,
  };

  const pipeline = new Map<string, { label: string; submitted: number; approved: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = daysAgo(i);
    pipeline.set(dayKey(d), { label: shortDayLabel(d), submitted: 0, approved: 0 });
  }

  for (const row of rows) {
    if (row.status === "pending") {
      pending += 1;
      pendingRows.push(row);
      const age = pendingAgeDays(row.submitted_at, now);
      oldestPendingDays =
        oldestPendingDays == null ? age : Math.max(oldestPendingDays, age);
      if (age <= 3) ageBuckets["0–3d"] += 1;
      else if (age <= 7) ageBuckets["4–7d"] += 1;
      else if (age <= 14) ageBuckets["8–14d"] += 1;
      else ageBuckets["15d+"] += 1;
    } else if (row.status === "approved") {
      approved += 1;
      approvedRows.push(row);
      if (row.approved_at) {
        const approvedAt = new Date(row.approved_at);
        if (approvedAt >= since30) approvedLast30Days += 1;
        if (approvedAt >= since14) {
          const key = dayKey(startOfDay(approvedAt));
          const point = pipeline.get(key);
          if (point) point.approved += 1;
        }
      }

      bumpSpendBucket(paymentBuckets, paymentSpendLabel(row.payment_method), row);
      bumpSpendBucket(entityBuckets, row.entity_billed || "Unspecified", row);
      bumpSpendBucket(typeBuckets, formatSubscriptionType(row.subscription_type), row);
      bumpSpendBucket(serviceBuckets, row.subscription_name || "Unknown", row);
    } else if (row.status === "rejected") {
      rejected += 1;
    }

    const submitted = new Date(row.submitted_at);
    if (submitted >= since14) {
      const key = dayKey(startOfDay(submitted));
      const point = pipeline.get(key);
      if (point) point.submitted += 1;
    }
  }

  pendingRows.sort(
    (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime(),
  );

  const recentApproved = [...approvedRows]
    .sort((a, b) => {
      const at = a.approved_at ? new Date(a.approved_at).getTime() : 0;
      const bt = b.approved_at ? new Date(b.approved_at).getTime() : 0;
      return bt - at;
    })
    .slice(0, 5);

  const employeeApproved = approvedRows.filter((r) => r.subscription_type !== "business");
  const businessApproved = approvedRows.filter((r) => r.subscription_type === "business");

  return {
    pending,
    approved,
    rejected,
    approvedLast30Days,
    oldestPendingDays,
    pendingQueue: pendingRows.slice(0, 12),
    spendAll: buildSpendSlice(approvedRows),
    spendEmployee: buildSpendSlice(employeeApproved),
    spendBusiness: buildSpendSlice(businessApproved),
    spendByPayment: finalizeSpendBuckets(paymentBuckets, 8),
    spendByEntity: finalizeSpendBuckets(entityBuckets, 8),
    spendByType: finalizeSpendBuckets(typeBuckets, 4),
    topServicesBySpend: finalizeSpendBuckets(serviceBuckets, 6),
    pendingAgeBuckets: Object.entries(ageBuckets).map(([label, value]) => ({ label, value })),
    pipelineByDay: [...pipeline.values()],
    recentApproved,
  };
}

export function formatCurrencyTotals(rows: CurrencyTotal[]): string {
  if (rows.length === 0) return "—";
  return rows.map((r) => formatMoney(r.total, r.currency)).join(" · ");
}

export function formatSpendRowTotals(totals: CurrencyTotal[]): string {
  if (totals.length === 0) return "—";
  return totals.map((r) => formatMoney(r.total, r.currency)).join(" · ");
}
