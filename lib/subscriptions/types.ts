export type SubscriptionStatus = "pending" | "approved" | "rejected";

export type BillingCycle = "monthly" | "yearly" | "one_time" | "other";

export type SubscriptionRequestRow = {
  id: string;
  reference_number: string;
  status: SubscriptionStatus;
  created_at: string;
  updated_at: string;
  submitted_at: string;
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

/** Payment method options — SW = Sense Wellness, SS = Seissense */
export const PAYMENT_METHOD_OPTIONS = [
  "Credit Card SW WLL",
  "Credit Card SS WLL",
  "AMEX SS WLL",
  "Bank Transfer",
] as const;
