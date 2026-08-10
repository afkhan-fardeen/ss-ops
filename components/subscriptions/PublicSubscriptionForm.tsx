"use client";

import { useState } from "react";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { BILLING_CYCLE_LABELS, CURRENCY_OPTIONS, ENTITY_OPTIONS } from "@/lib/subscriptions/constants";

type FormState = {
  employee_name: string;
  employee_email: string;
  department: string;
  job_title: string;
  subscription_name: string;
  vendor: string;
  amount: string;
  currency: string;
  billing_cycle: string;
  billing_cycle_other: string;
  entity_billed: string;
  payment_method: string;
  justification: string;
  notes: string;
  website: string;
};

const INITIAL: FormState = {
  employee_name: "",
  employee_email: "",
  department: "",
  job_title: "",
  subscription_name: "",
  vendor: "",
  amount: "",
  currency: "USD",
  billing_cycle: "monthly",
  billing_cycle_other: "",
  entity_billed: "",
  payment_method: "",
  justification: "",
  notes: "",
  website: "",
};

export function PublicSubscriptionForm() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/subscriptions/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
        }),
      });
      const json = (await res.json()) as { ok?: boolean; referenceNumber?: string; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Submission failed");
        return;
      }
      setReferenceNumber(json.referenceNumber ?? null);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  if (referenceNumber) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-subscriptions-bg text-subscriptions">
          <CheckCircle2 size={28} />
        </div>
        <h2 className="font-display text-xl font-medium text-ink">Request submitted</h2>
        <p className="text-[14px] text-muted">
          Your reference number is{" "}
          <span className="font-mono font-medium text-ink">{referenceNumber}</span>
        </p>
        <p className="text-[13px] text-muted">
          Finance will review your request. Print and sign the generated form when instructed.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Honeypot */}
      <input
        type="text"
        name="website"
        value={form.website}
        onChange={(e) => set("website", e.target.value)}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
      />

      <section className="space-y-3">
        <h2 className="text-[12px] font-medium uppercase tracking-wider text-muted">
          Your details
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name" required>
            <Input
              required
              value={form.employee_name}
              onChange={(e) => set("employee_name", e.target.value)}
              placeholder="As on company records"
              disabled={loading}
            />
          </Field>
          <Field label="Company email" required>
            <Input
              required
              type="email"
              value={form.employee_email}
              onChange={(e) => set("employee_email", e.target.value)}
              placeholder="you@seissense.com"
              disabled={loading}
            />
          </Field>
          <Field label="Department">
            <Input
              value={form.department}
              onChange={(e) => set("department", e.target.value)}
              disabled={loading}
            />
          </Field>
          <Field label="Job title">
            <Input
              value={form.job_title}
              onChange={(e) => set("job_title", e.target.value)}
              disabled={loading}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[12px] font-medium uppercase tracking-wider text-muted">
          Subscription details
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Subscription / service name" required className="sm:col-span-2">
            <Input
              required
              value={form.subscription_name}
              onChange={(e) => set("subscription_name", e.target.value)}
              placeholder="e.g. Claude Pro, Adobe Creative Cloud"
              disabled={loading}
            />
          </Field>
          <Field label="Website / provider">
            <Input
              value={form.vendor}
              onChange={(e) => set("vendor", e.target.value)}
              placeholder="e.g. anthropic.com"
              disabled={loading}
            />
          </Field>
          <Field label="Entity to be billed">
            <select
              value={form.entity_billed}
              onChange={(e) => set("entity_billed", e.target.value)}
              className="min-h-11 w-full rounded-card border border-line bg-white px-3 text-base text-ink focus:border-subscriptions focus:outline-none focus:ring-2 focus:ring-subscriptions/30"
              disabled={loading}
            >
              <option value="">Select entity…</option>
              {ENTITY_OPTIONS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estimated cost" required>
            <Input
              required
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              disabled={loading}
            />
          </Field>
          <Field label="Currency" required>
            <select
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
              className="min-h-11 w-full rounded-card border border-line bg-white px-3 text-base text-ink focus:border-subscriptions focus:outline-none focus:ring-2 focus:ring-subscriptions/30"
              disabled={loading}
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Billing frequency" required className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(BILLING_CYCLE_LABELS) as Array<keyof typeof BILLING_CYCLE_LABELS>).map(
                (key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => set("billing_cycle", key)}
                    className={[
                      "rounded-full px-3 py-1.5 text-[13px] font-medium transition",
                      form.billing_cycle === key
                        ? "bg-subscriptions-bg text-subscriptions"
                        : "border border-line bg-white text-muted hover:text-ink",
                    ].join(" ")}
                    disabled={loading}
                  >
                    {BILLING_CYCLE_LABELS[key]}
                  </button>
                ),
              )}
            </div>
            {form.billing_cycle === "other" && (
              <Input
                className="mt-2"
                value={form.billing_cycle_other}
                onChange={(e) => set("billing_cycle_other", e.target.value)}
                placeholder="Specify frequency"
                required
                disabled={loading}
              />
            )}
          </Field>
          <Field label="Payment method requested" className="sm:col-span-2">
            <Input
              value={form.payment_method}
              onChange={(e) => set("payment_method", e.target.value)}
              placeholder="e.g. Company bank transfer, invoice"
              disabled={loading}
            />
          </Field>
          <Field label="Business justification" className="sm:col-span-2">
            <textarea
              value={form.justification}
              onChange={(e) => set("justification", e.target.value)}
              rows={3}
              className="min-h-[88px] w-full rounded-card border border-line bg-white px-3 py-2 text-base text-ink placeholder:text-muted focus:border-subscriptions focus:outline-none focus:ring-2 focus:ring-subscriptions/30"
              placeholder="Why is this subscription required?"
              disabled={loading}
            />
          </Field>
        </div>
      </section>

      {error ? (
        <p className="rounded-lg border border-fulfillment/30 bg-fulfillment/5 px-3 py-2 text-[13px] text-fulfillment">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-card bg-subscriptions px-4 text-[14px] font-medium text-white shadow-soft transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        {loading ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-[12px] font-medium text-ink">
        {label}
        {required ? <span className="text-fulfillment"> *</span> : null}
      </label>
      {children}
    </div>
  );
}
