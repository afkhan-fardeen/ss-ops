import type { PublicSubscriptionPayload, BillingCycle } from "./types";
import { CURRENCY_OPTIONS, ENTITY_OPTIONS } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parsePublicSubscriptionPayload(
  body: unknown,
): { ok: true; data: PublicSubscriptionPayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.website === "string" && b.website.trim()) {
    return { ok: false, error: "Rejected" };
  }

  const employee_name = str(b.employee_name);
  const employee_email = str(b.employee_email).toLowerCase();
  const subscription_name = str(b.subscription_name);
  const amountRaw = b.amount;
  const currency = str(b.currency).toUpperCase() || "USD";
  const billing_cycle = str(b.billing_cycle) as BillingCycle;

  if (!employee_name) return { ok: false, error: "Employee name is required" };
  if (!employee_email || !EMAIL_RE.test(employee_email)) {
    return { ok: false, error: "Valid email is required" };
  }
  if (!subscription_name) return { ok: false, error: "Subscription name is required" };

  const amount =
    typeof amountRaw === "number"
      ? amountRaw
      : typeof amountRaw === "string"
        ? parseFloat(amountRaw)
        : NaN;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Valid amount is required" };
  }

  if (!CURRENCY_OPTIONS.includes(currency as (typeof CURRENCY_OPTIONS)[number])) {
    return { ok: false, error: "Invalid currency" };
  }

  const validCycles: BillingCycle[] = ["monthly", "yearly", "one_time", "other"];
  if (!validCycles.includes(billing_cycle)) {
    return { ok: false, error: "Invalid billing cycle" };
  }

  const entity_billed = str(b.entity_billed);
  if (entity_billed && !ENTITY_OPTIONS.includes(entity_billed as (typeof ENTITY_OPTIONS)[number])) {
    return { ok: false, error: "Invalid entity" };
  }

  const billing_cycle_other = str(b.billing_cycle_other);
  if (billing_cycle === "other" && !billing_cycle_other) {
    return { ok: false, error: "Please specify billing frequency" };
  }

  return {
    ok: true,
    data: {
      employee_name,
      employee_email,
      department: optStr(b.department),
      job_title: optStr(b.job_title),
      subscription_name,
      vendor: optStr(b.vendor),
      amount,
      currency,
      billing_cycle,
      billing_cycle_other: billing_cycle === "other" ? billing_cycle_other : undefined,
      entity_billed: entity_billed || undefined,
      payment_method: optStr(b.payment_method),
      start_date: optStr(b.start_date),
      justification: optStr(b.justification),
      notes: optStr(b.notes),
    },
  };
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function optStr(v: unknown): string | undefined {
  const s = str(v);
  return s || undefined;
}
