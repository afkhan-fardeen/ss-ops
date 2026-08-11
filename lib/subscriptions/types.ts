export type SubscriptionStatus = "pending" | "approved" | "rejected";

export type BillingCycle = "monthly" | "yearly" | "one_time" | "other";

export type SubscriptionType = "employee" | "business";

export type SubscriptionRequestRow = {
  id: string;
  reference_number: string;
  status: SubscriptionStatus;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  subscription_type: SubscriptionType;
  employee_name: string;
  employee_email: string;
  department: string | null;
  job_title: string | null;
  subscription_name: string;
  vendor: string | null;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  billing_cycle_other: string | null;
  entity_billed: string | null;
  payment_method: string | null;
  start_date: string | null;
  justification: string | null;
  notes: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_by_name: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  pdf_storage_path: string | null;
  pdf_generated_at: string | null;
};

export type PublicSubscriptionPayload = {
  subscription_type: SubscriptionType;
  employee_name: string;
  employee_email: string;
  department?: string;
  job_title?: string;
  subscription_name: string;
  vendor?: string;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  billing_cycle_other?: string;
  entity_billed?: string;
  payment_method?: string;
  start_date?: string;
  justification?: string;
  notes?: string;
  website?: string; // honeypot
};

export const ENTITY_OPTIONS = [
  "Seissense W.L.L. (Bahrain)",
  "Sense Wellness W.L.L. (Bahrain)",
  "Seissense FZE (UAE)",
  "Sensewellness FZE (UAE)",
  "Sense Wellness Company Ltd / Love Boo (UK)",
  "Seissense Company Limited (UK)",
] as const;

export const CURRENCY_OPTIONS = ["USD", "BHD", "GBP", "EUR", "AED"] as const;

/**
 * Payment / card options — name + last 4 (SW = Sense Wellness, SS = Seissense).
 * Stored as `"Name (last4)"` when a card applies, or `"Bank Transfer"`.
 */
export const PAYMENT_METHODS = [
  { name: "Khaled SS", last4: "1195" },
  { name: "Adeel SS", last4: "8864" },
  { name: "Hannah SW", last4: "3223" },
  { name: "SS AMEX", last4: "8015" },
  { name: "Bank Transfer", last4: null },
] as const;

export type PaymentMethodOption = (typeof PAYMENT_METHODS)[number];

export function paymentMethodValue(m: PaymentMethodOption): string {
  return m.last4 ? `${m.name} (${m.last4})` : m.name;
}

export const PAYMENT_METHOD_OPTIONS = [
  "Khaled SS (1195)",
  "Adeel SS (8864)",
  "Hannah SW (3223)",
  "SS AMEX (8015)",
  "Bank Transfer",
] as const;
