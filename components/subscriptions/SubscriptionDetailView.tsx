"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Download,
  Loader2,
  Pencil,
  Printer,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { BillingCycle, SubscriptionRequestRow } from "@/lib/subscriptions/types";
import {
  BILLING_CYCLE_LABELS,
  CURRENCY_OPTIONS,
  ENTITY_OPTIONS,
  formatBillingCycle,
  formatMoney,
  PAYMENT_METHOD_OPTIONS,
  STATUS_LABELS,
} from "@/lib/subscriptions/constants";

function toDateInputValue(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}

type FormDraft = {
  submitted_at: string;
  employee_name: string;
  employee_email: string;
  department: string;
  job_title: string;
  subscription_name: string;
  vendor: string;
  amount: string;
  currency: string;
  billing_cycle: BillingCycle;
  billing_cycle_other: string;
  entity_billed: string;
  payment_method: string;
  justification: string;
};

function draftFromRow(row: SubscriptionRequestRow): FormDraft {
  return {
    submitted_at: toDateInputValue(row.submitted_at),
    employee_name: row.employee_name,
    employee_email: row.employee_email,
    department: row.department ?? "",
    job_title: row.job_title ?? "",
    subscription_name: row.subscription_name,
    vendor: row.vendor ?? "",
    amount: String(row.amount),
    currency: row.currency,
    billing_cycle: row.billing_cycle,
    billing_cycle_other: row.billing_cycle_other ?? "",
    entity_billed: row.entity_billed ?? "",
    payment_method: row.payment_method ?? "",
    justification: row.justification ?? "",
  };
}

export function SubscriptionDetailView({ row }: { row: SubscriptionRequestRow }) {
  const router = useRouter();
  const [status, setStatus] = useState(row.status);
  const [approvedBy, setApprovedBy] = useState(row.approved_by_name);
  const [approvedAt, setApprovedAt] = useState(row.approved_at);
  const [rejectionReason, setRejectionReason] = useState(row.rejection_reason);
  const [loading, setLoading] = useState<"approve" | "reject" | "delete" | "save" | null>(
    null,
  );
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rejectInput, setRejectInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<FormDraft>(() => draftFromRow(row));
  const [saved, setSaved] = useState<FormDraft>(() => draftFromRow(row));
  const [pdfKey, setPdfKey] = useState(0);

  const pdfUrl = `/api/subscriptions/${row.id}/pdf?v=${pdfKey}`;
  const isPending = status === "pending";

  function setField<K extends keyof FormDraft>(key: K, value: FormDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function cancelEdit() {
    setDraft(saved);
    setEditing(false);
  }

  async function handleApprove() {
    setLoading("approve");
    try {
      const res = await fetch(`/api/subscriptions/${row.id}/approve`, { method: "POST" });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        approved_by_name?: string;
        approved_at?: string;
      };
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "Approve failed");
        return;
      }
      setStatus("approved");
      setApprovedBy(json.approved_by_name ?? null);
      setApprovedAt(json.approved_at ?? null);
      setPdfKey((k) => k + 1);
      toast.success("Request approved");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    setLoading("reject");
    try {
      const res = await fetch(`/api/subscriptions/${row.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectInput.trim() || undefined }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "Reject failed");
        return;
      }
      setStatus("rejected");
      setRejectionReason(rejectInput.trim() || null);
      setShowRejectModal(false);
      setPdfKey((k) => k + 1);
      toast.success("Request rejected");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(null);
    }
  }

  async function handleSaveFields() {
    if (!draft.submitted_at) {
      toast.error("Form signed date is required");
      return;
    }
    if (!draft.employee_name.trim() || !draft.employee_email.trim()) {
      toast.error("Employee name and email are required");
      return;
    }
    if (!draft.subscription_name.trim()) {
      toast.error("Subscription name is required");
      return;
    }
    const amount = parseFloat(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Valid amount is required");
      return;
    }
    if (draft.billing_cycle === "other" && !draft.billing_cycle_other.trim()) {
      toast.error("Please specify other billing frequency");
      return;
    }

    setLoading("save");
    try {
      const res = await fetch(`/api/subscriptions/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitted_at: draft.submitted_at,
          employee_name: draft.employee_name.trim(),
          employee_email: draft.employee_email.trim(),
          department: draft.department.trim() || null,
          job_title: draft.job_title.trim() || null,
          subscription_name: draft.subscription_name.trim(),
          vendor: draft.vendor.trim() || null,
          amount,
          currency: draft.currency,
          billing_cycle: draft.billing_cycle,
          billing_cycle_other:
            draft.billing_cycle === "other" ? draft.billing_cycle_other.trim() : null,
          entity_billed: draft.entity_billed || null,
          payment_method: draft.payment_method || null,
          justification: draft.justification.trim() || null,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        row?: SubscriptionRequestRow;
      };
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "Save failed");
        return;
      }
      const next = json.row ? draftFromRow(json.row) : draft;
      setSaved(next);
      setDraft(next);
      setEditing(false);
      setPdfKey((k) => k + 1);
      toast.success("Updated — PDF regenerated");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete() {
    setLoading("delete");
    try {
      const res = await fetch(`/api/subscriptions/${row.id}`, { method: "DELETE" });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "Delete failed");
        return;
      }
      toast.success(`Deleted ${row.reference_number}`);
      router.push("/subscriptions");
      router.refresh();
    } catch {
      toast.error("Network error");
      setLoading(null);
    }
  }

  function handlePrint() {
    const w = window.open(pdfUrl, "_blank");
    w?.addEventListener("load", () => w.print());
  }

  const display = editing ? draft : saved;

  return (
    <div className="space-y-5">
      <Link
        href="/subscriptions"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted transition hover:text-ink"
      >
        <ArrowLeft size={14} />
        Back to requests
      </Link>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <div className="rounded-card border border-line bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-[12px] text-muted">{row.reference_number}</p>
                <h2 className="mt-1 text-lg font-medium text-ink">
                  {display.subscription_name}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                    status === "pending"
                      ? "bg-gold/10 text-gold"
                      : status === "approved"
                        ? "bg-cod-bg text-cod"
                        : "bg-fulfillment/10 text-fulfillment"
                  }`}
                >
                  {STATUS_LABELS[status]}
                </span>
                {!editing ? (
                  <button
                    type="button"
                    disabled={loading !== null}
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-1.5 rounded-card border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-ink transition hover:bg-canvas disabled:opacity-60"
                  >
                    <Pencil size={13} />
                    Edit
                  </button>
                ) : null}
              </div>
            </div>

            {!editing ? (
              <dl className="mt-4 space-y-2 text-[13px]">
                <Row label="Form signed date" value={new Date(saved.submitted_at + "T12:00:00").toLocaleDateString()} />
                <Row label="Employee" value={saved.employee_name} />
                <Row label="Email" value={saved.employee_email} mono />
                <Row label="Department" value={saved.department || null} />
                <Row label="Job title" value={saved.job_title || null} />
                <Row label="Provider" value={saved.vendor || null} />
                <Row
                  label="Cost"
                  value={formatMoney(Number(saved.amount), saved.currency)}
                  mono
                />
                <Row
                  label="Billing"
                  value={formatBillingCycle(saved.billing_cycle, saved.billing_cycle_other || null)}
                />
                <Row label="Entity billed" value={saved.entity_billed || null} />
                <Row label="Payment / card" value={saved.payment_method || null} />
                {saved.justification ? (
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-muted">
                      Justification
                    </dt>
                    <dd className="mt-0.5 text-ink">{saved.justification}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                  Edit form details
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Form signed date" required>
                    <input
                      type="date"
                      value={draft.submitted_at}
                      onChange={(e) => setField("submitted_at", e.target.value)}
                      disabled={loading !== null}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Subscription / service" required>
                    <input
                      value={draft.subscription_name}
                      onChange={(e) => setField("subscription_name", e.target.value)}
                      disabled={loading !== null}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Employee name" required>
                    <input
                      value={draft.employee_name}
                      onChange={(e) => setField("employee_name", e.target.value)}
                      disabled={loading !== null}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Email" required>
                    <input
                      type="email"
                      value={draft.employee_email}
                      onChange={(e) => setField("employee_email", e.target.value)}
                      disabled={loading !== null}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Department">
                    <input
                      value={draft.department}
                      onChange={(e) => setField("department", e.target.value)}
                      disabled={loading !== null}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Job title">
                    <input
                      value={draft.job_title}
                      onChange={(e) => setField("job_title", e.target.value)}
                      disabled={loading !== null}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Website / provider">
                    <input
                      value={draft.vendor}
                      onChange={(e) => setField("vendor", e.target.value)}
                      disabled={loading !== null}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Entity to be billed">
                    <select
                      value={draft.entity_billed}
                      onChange={(e) => setField("entity_billed", e.target.value)}
                      disabled={loading !== null}
                      className={inputClass}
                    >
                      <option value="">Select entity…</option>
                      {ENTITY_OPTIONS.map((e) => (
                        <option key={e} value={e}>
                          {e}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Amount" required>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={draft.amount}
                      onChange={(e) => setField("amount", e.target.value)}
                      disabled={loading !== null}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Currency" required>
                    <select
                      value={draft.currency}
                      onChange={(e) => setField("currency", e.target.value)}
                      disabled={loading !== null}
                      className={inputClass}
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
                      {(Object.keys(BILLING_CYCLE_LABELS) as BillingCycle[]).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setField("billing_cycle", key)}
                          disabled={loading !== null}
                          className={[
                            "rounded-full px-3 py-1.5 text-[13px] font-medium transition",
                            draft.billing_cycle === key
                              ? "bg-subscriptions-bg text-subscriptions"
                              : "border border-line bg-white text-muted hover:text-ink",
                          ].join(" ")}
                        >
                          {BILLING_CYCLE_LABELS[key]}
                        </button>
                      ))}
                    </div>
                    {draft.billing_cycle === "other" ? (
                      <input
                        className={`${inputClass} mt-2`}
                        value={draft.billing_cycle_other}
                        onChange={(e) => setField("billing_cycle_other", e.target.value)}
                        placeholder="Specify frequency"
                        disabled={loading !== null}
                      />
                    ) : null}
                  </Field>
                  <Field label="Payment method / card (last 4)" className="sm:col-span-2">
                    <select
                      value={draft.payment_method}
                      onChange={(e) => setField("payment_method", e.target.value)}
                      disabled={loading !== null}
                      className={inputClass}
                    >
                      <option value="">Select payment method…</option>
                      {PAYMENT_METHOD_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                      {draft.payment_method &&
                      !PAYMENT_METHOD_OPTIONS.includes(
                        draft.payment_method as (typeof PAYMENT_METHOD_OPTIONS)[number],
                      ) ? (
                        <option value={draft.payment_method}>
                          {draft.payment_method} (legacy)
                        </option>
                      ) : null}
                    </select>
                  </Field>
                  <Field label="Business justification" className="sm:col-span-2">
                    <textarea
                      value={draft.justification}
                      onChange={(e) => setField("justification", e.target.value)}
                      rows={3}
                      disabled={loading !== null}
                      className="min-h-[88px] w-full rounded-card border border-line bg-white px-3 py-2 text-base text-ink focus:border-subscriptions focus:outline-none focus:ring-2 focus:ring-subscriptions/30"
                    />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={loading !== null}
                    onClick={handleSaveFields}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-card bg-subscriptions px-4 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    {loading === "save" ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Save size={15} />
                    )}
                    Save changes
                  </button>
                  <button
                    type="button"
                    disabled={loading !== null}
                    onClick={cancelEdit}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-card border border-line bg-white px-4 text-[13px] font-medium text-muted transition hover:bg-canvas disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {approvedBy && approvedAt ? (
              <p className="mt-4 border-t border-line pt-3 text-[12px] text-muted">
                Approved by <span className="font-medium text-ink">{approvedBy}</span> on{" "}
                {new Date(approvedAt).toLocaleString()}
              </p>
            ) : null}
            {status === "rejected" && rejectionReason ? (
              <p className="mt-4 border-t border-line pt-3 text-[12px] text-fulfillment">
                Rejection reason: {rejectionReason}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={pdfUrl}
              download={`${row.reference_number}.pdf`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-card border border-line bg-white px-4 text-[13px] font-medium text-ink transition hover:bg-canvas"
            >
              <Download size={15} />
              Download PDF
            </a>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-card border border-line bg-white px-4 text-[13px] font-medium text-ink transition hover:bg-canvas"
            >
              <Printer size={15} />
              Print
            </button>
            {isPending ? (
              <>
                <button
                  type="button"
                  disabled={loading !== null || editing}
                  onClick={handleApprove}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-card bg-cod px-4 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {loading === "approve" ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Check size={15} />
                  )}
                  Approve
                </button>
                <button
                  type="button"
                  disabled={loading !== null || editing}
                  onClick={() => setShowRejectModal(true)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-card border border-fulfillment/40 bg-fulfillment/5 px-4 text-[13px] font-medium text-fulfillment transition hover:bg-fulfillment/10 disabled:opacity-60"
                >
                  <X size={15} />
                  Reject
                </button>
              </>
            ) : null}
            <button
              type="button"
              disabled={loading !== null || editing}
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-card border border-line bg-white px-4 text-[13px] font-medium text-fulfillment transition hover:bg-fulfillment/5 disabled:opacity-60"
            >
              <Trash2 size={15} />
              Delete permanently
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-card border border-line bg-white shadow-soft">
          <div className="border-b border-line px-4 py-2.5 text-[12px] font-medium text-muted">
            Form preview
          </div>
          <iframe
            key={pdfKey}
            title="Subscription request PDF"
            src={pdfUrl}
            className="h-[min(80vh,720px)] w-full bg-canvas"
          />
        </div>
      </div>

      {showRejectModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-md rounded-card border border-line bg-white p-5 shadow-pop">
            <h3 className="text-base font-medium text-ink">Reject request</h3>
            <p className="mt-1 text-[13px] text-muted">Optional reason for the employee record.</p>
            <textarea
              value={rejectInput}
              onChange={(e) => setRejectInput(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-card border border-line px-3 py-2 text-base text-ink focus:border-subscriptions focus:outline-none focus:ring-2 focus:ring-subscriptions/30"
              placeholder="Reason (optional)"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="rounded-card border border-line px-4 py-2 text-[13px] font-medium text-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading === "reject"}
                onClick={handleReject}
                className="inline-flex items-center gap-1.5 rounded-card bg-fulfillment px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60"
              >
                {loading === "reject" ? <Loader2 size={14} className="animate-spin" /> : null}
                Confirm reject
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-md rounded-card border border-line bg-white p-5 shadow-pop">
            <h3 className="text-base font-medium text-ink">Delete permanently?</h3>
            <p className="mt-1 text-[13px] text-muted">
              This removes <span className="font-mono text-ink">{row.reference_number}</span> and its
              PDF forever. This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={loading === "delete"}
                className="rounded-card border border-line px-4 py-2 text-[13px] font-medium text-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading === "delete"}
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 rounded-card bg-fulfillment px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60"
              >
                {loading === "delete" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Delete forever
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const inputClass =
  "min-h-11 w-full rounded-card border border-line bg-white px-3 text-base text-ink focus:border-subscriptions focus:outline-none focus:ring-2 focus:ring-subscriptions/30";

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

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-right text-ink ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
