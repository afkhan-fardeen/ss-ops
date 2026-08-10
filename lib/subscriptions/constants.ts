import {
  ENTITY_OPTIONS,
  CURRENCY_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_METHODS,
  paymentMethodValue,
} from "./types";
import type { BillingCycle } from "./types";

export {
  ENTITY_OPTIONS,
  CURRENCY_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_METHODS,
  paymentMethodValue,
};

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

/** Always shown as the management approver on approved subscription forms. */
export const SUBSCRIPTION_APPROVER_NAME = "Khaled Tahoun";

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

/** Last 4 digits from a payment label like "Hannah SW (3223)", or null. */
export function paymentLast4(paymentMethod: string | null | undefined): string | null {
  if (!paymentMethod) return null;
  const normalized = normalizePaymentMethod(paymentMethod);
  if (!normalized) return null;
  const m = normalized.match(/\((\d{4})\)\s*$/);
  return m?.[1] ?? null;
}

/** Payment name without trailing (last4), e.g. "Khaled SS". */
export function paymentLabel(paymentMethod: string | null | undefined): string {
  if (!paymentMethod) return "—";
  const normalized = normalizePaymentMethod(paymentMethod) ?? paymentMethod;
  return normalized.replace(/\s*\(\d{4}\)\s*$/, "").trim() || normalized;
}

/** Select / table display: "Khaled SS — 1195" or "Bank Transfer". */
export function paymentOptionLabel(paymentMethod: string | null | undefined): string {
  if (!paymentMethod) return "—";
  const normalized = normalizePaymentMethod(paymentMethod) ?? paymentMethod;
  const last4 = normalized.match(/\((\d{4})\)\s*$/)?.[1];
  const name = normalized.replace(/\s*\(\d{4}\)\s*$/, "").trim() || normalized;
  return last4 ? `${name} — ${last4}` : name;
}

export function formatPaymentMethod(paymentMethod: string | null | undefined): string {
  return paymentOptionLabel(paymentMethod);
}

/** Map old / free-text payment strings onto the current option values. */
export function normalizePaymentMethod(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (
    PAYMENT_METHOD_OPTIONS.includes(
      trimmed as (typeof PAYMENT_METHOD_OPTIONS)[number],
    )
  ) {
    return trimmed;
  }

  // Explicit legacy renames
  const aliases: Record<string, string> = {
    "Khaled SS Credit SS WLL (1195)": "Khaled SS (1195)",
    "Khaled SS Credit SS WLL": "Khaled SS (1195)",
    "Credit Card SS WLL": "Khaled SS (1195)",
    "Khaled SS": "Khaled SS (1195)",
    "Adeel SS": "Adeel SS (8864)",
    "Hannah SW": "Hannah SW (3223)",
    "SS AMEX": "SS AMEX (8015)",
  };
  if (aliases[trimmed]) return aliases[trimmed];

  const last4 = trimmed.match(/\((\d{4})\)\s*$/)?.[1];
  if (last4) {
    const byLast4 = PAYMENT_METHODS.find((m) => m.last4 === last4);
    if (byLast4) return paymentMethodValue(byLast4);
  }

  if (/bank\s*transfer/i.test(trimmed)) return "Bank Transfer";

  return trimmed;
}

export function isKnownPaymentMethod(value: string | null | undefined): boolean {
  const n = normalizePaymentMethod(value);
  return !!n && PAYMENT_METHOD_OPTIONS.includes(n as (typeof PAYMENT_METHOD_OPTIONS)[number]);
}
