"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Download,
  Loader2,
  Printer,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { SubscriptionRequestRow } from "@/lib/subscriptions/types";
import {
  formatBillingCycle,
  formatMoney,
  STATUS_LABELS,
} from "@/lib/subscriptions/constants";

export function SubscriptionDetailView({ row }: { row: SubscriptionRequestRow }) {
  const router = useRouter();
  const [status, setStatus] = useState(row.status);
  const [approvedBy, setApprovedBy] = useState(row.approved_by_name);
  const [approvedAt, setApprovedAt] = useState(row.approved_at);
  const [rejectionReason, setRejectionReason] = useState(row.rejection_reason);
  const [loading, setLoading] = useState<"approve" | "reject" | "delete" | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rejectInput, setRejectInput] = useState("");

  const pdfUrl = `/api/subscriptions/${row.id}/pdf`;
  const isPending = status === "pending";

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
      toast.success("Request rejected");
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
              <div>
                <p className="font-mono text-[12px] text-muted">{row.reference_number}</p>
                <h2 className="mt-1 text-lg font-medium text-ink">{row.subscription_name}</h2>
              </div>
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
            </div>

            <dl className="mt-4 space-y-2 text-[13px]">
              <Row label="Employee" value={row.employee_name} />
              <Row label="Email" value={row.employee_email} mono />
              <Row label="Department" value={row.department} />
              <Row label="Job title" value={row.job_title} />
              <Row label="Provider" value={row.vendor} />
              <Row
                label="Cost"
                value={formatMoney(Number(row.amount), row.currency)}
                mono
              />
              <Row
                label="Billing"
                value={formatBillingCycle(row.billing_cycle, row.billing_cycle_other)}
              />
              <Row label="Entity billed" value={row.entity_billed} />
              <Row label="Payment method" value={row.payment_method} />
              {row.justification ? (
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-muted">Justification</dt>
                  <dd className="mt-0.5 text-ink">{row.justification}</dd>
                </div>
              ) : null}
            </dl>

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
                  disabled={loading !== null}
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
                  disabled={loading !== null}
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
              disabled={loading !== null}
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-card border border-line bg-white px-4 text-[13px] font-medium text-fulfillment transition hover:bg-fulfillment/5 disabled:opacity-60"
            >
              <Trash2 size={15} />
              Delete permanently
            </button>
          </div>
        </div>

        <div className="rounded-card border border-line bg-white shadow-soft overflow-hidden">
          <div className="border-b border-line px-4 py-2.5 text-[12px] font-medium text-muted">
            Form preview
          </div>
          <iframe
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
                {loading === "delete" ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete forever
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
