import { ENTITY_OPTIONS, CURRENCY_OPTIONS } from "./types";
import type { BillingCycle } from "./types";

export { ENTITY_OPTIONS, CURRENCY_OPTIONS };

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: "Monthly",
  yearly: "Annually",
  one_time: "One-time",
  other: "Other",
};

export const STATUS_LABELS = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
} as const;

export function formatMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

export function formatBillingCycle(
  cycle: BillingCycle,
  other?: string | null,
): string {
  if (cycle === "other" && other) return other;
  return BILLING_CYCLE_LABELS[cycle] ?? cycle;
}
