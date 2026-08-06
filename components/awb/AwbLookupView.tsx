"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileSearch,
  ExternalLink,
  Download,
  Loader2,
  AlertCircle,
  Tag,
  FileText,
} from "lucide-react";
import { STORE_LABELS } from "@/lib/stores/labels";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AwbApiResponse =
  | { ok: true; pdfUrl: string; tracking: string; orderName: string; source: "db" | "live" }
  | { ok: false; error: string; reason: string; tracking?: string };

type InvoiceApiError = { ok: false; error: string; reason: string };

type PdfState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; blobUrl: string; label: string; directUrl?: string }
  | { status: "error"; message: string; reason: string };

type AwbFoundExtra = { tracking: string; orderName: string; source: "db" | "live" };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AwbLookupView({ storeCount }: { storeCount: 1 | 2 }) {
  const [orderInput, setOrderInput] = useState("");
  const [store, setStore] = useState<1 | 2>(1);

  const [awbState, setAwbState] = useState<PdfState>({ status: "idle" });
  const [awbExtra, setAwbExtra] = useState<AwbFoundExtra | null>(null);
  const [invoiceState, setInvoiceState] = useState<PdfState>({ status: "idle" });

  // Track blob URLs for cleanup
  const invoiceBlobRef = useRef<string | null>(null);

  function revokeBlobUrls() {
    if (invoiceBlobRef.current) {
      URL.revokeObjectURL(invoiceBlobRef.current);
      invoiceBlobRef.current = null;
    }
  }

  // Cleanup on unmount
  useEffect(() => () => revokeBlobUrls(), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = orderInput.trim();
    if (!trimmed) return;

    revokeBlobUrls();
    setAwbState({ status: "loading" });
    setAwbExtra(null);
    setInvoiceState({ status: "loading" });

    const params = new URLSearchParams({ orderName: trimmed, store: String(store) });

    // Update each panel as soon as it settles — don't wait for the other side.
    void fetch(`/api/awb?${params.toString()}`)
      .then((r) => r.json() as Promise<AwbApiResponse>)
      .then((json) => {
        if (json.ok) {
          setAwbState({
            status: "found",
            blobUrl: json.pdfUrl,
            label: json.tracking,
            directUrl: json.pdfUrl,
          });
          setAwbExtra({ tracking: json.tracking, orderName: json.orderName, source: json.source });
        } else {
          setAwbState({ status: "error", message: json.error, reason: json.reason });
        }
      })
      .catch((err) => {
        setAwbState({
          status: "error",
          message: err instanceof Error ? err.message : "AWB request failed",
          reason: "network",
        });
      });

    void fetch(`/api/invoice?orderName=${encodeURIComponent(trimmed)}`)
      .then(async (r) => {
        if (r.ok) {
          const invoiceNumber = r.headers.get("x-invoice-number") ?? "Invoice";
          const bytes = await r.arrayBuffer();
          const blob = new Blob([bytes], { type: "application/pdf" });
          const blobUrl = URL.createObjectURL(blob);
          invoiceBlobRef.current = blobUrl;
          return { ok: true as const, blobUrl, invoiceNumber };
        }
        return r.json() as Promise<InvoiceApiError>;
      })
      .then((res) => {
        if (res.ok) {
          setInvoiceState({
            status: "found",
            blobUrl: res.blobUrl,
            label: res.invoiceNumber,
          });
        } else {
          setInvoiceState({ status: "error", message: res.error, reason: res.reason });
        }
      })
      .catch((err) => {
        setInvoiceState({
          status: "error",
          message: err instanceof Error ? err.message : "Invoice request failed",
          reason: "network",
        });
      });
  }

  function reset() {
    revokeBlobUrls();
    setAwbState({ status: "idle" });
    setAwbExtra(null);
    setInvoiceState({ status: "idle" });
  }

  const isLoading = awbState.status === "loading" || invoiceState.status === "loading";
  const showResults =
    awbState.status !== "idle" || invoiceState.status !== "idle";

  return (
    <div className="space-y-5">
      {/* Search form */}
      <div className="rounded-card border border-line bg-white p-5 shadow-soft">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label
              htmlFor="order-input"
              className="block text-[12px] font-medium uppercase tracking-wider text-muted"
            >
              Order number
            </label>
            <input
              id="order-input"
              type="text"
              value={orderInput}
              onChange={(e) => setOrderInput(e.target.value)}
              placeholder="MOVE-252659 or GCC-SS1011"
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-awb/40 focus:border-awb transition-colors"
              disabled={isLoading}
              autoComplete="off"
            />
          </div>

          {storeCount === 2 && (
            <div className="space-y-1.5">
              <label
                htmlFor="store-select"
                className="block text-[12px] font-medium uppercase tracking-wider text-muted"
              >
                Store
              </label>
              <select
                id="store-select"
                value={store}
                onChange={(e) => setStore(Number(e.target.value) as 1 | 2)}
                className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-awb/40 focus:border-awb transition-colors"
                disabled={isLoading}
              >
                <option value={1}>{STORE_LABELS[1]}</option>
                <option value={2}>{STORE_LABELS[2]}</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !orderInput.trim()}
            className="flex items-center gap-2 rounded-lg bg-awb px-5 py-2 text-sm font-medium text-white shadow-soft transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <FileSearch size={15} />
            )}
            {isLoading ? "Looking up…" : "Look up"}
          </button>
        </form>
      </div>

      {/* Results — each panel paints as soon as it settles */}
      {showResults && (
        <div className="space-y-4">
          {/* Metadata bar */}
          {awbExtra && (
            <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-white p-4 shadow-soft">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-awb-bg px-3 py-1 font-mono text-[12px] font-medium text-awb">
                <Tag size={11} />
                {awbExtra.orderName}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-awb-bg px-3 py-1 font-mono text-[12px] font-medium text-awb">
                {awbExtra.tracking}
              </span>
              {awbExtra.source === "live" && (
                <span className="rounded-full bg-cod-bg px-2.5 py-0.5 text-[11px] font-medium text-cod">
                  live match
                </span>
              )}
            </div>
          )}

          {/* Two-column PDF grid */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <PdfColumn
              title="Airway Bill"
              icon={<FileSearch size={14} />}
              state={awbState}
              accentClass="text-awb"
              accentBgClass="bg-awb-bg"
            />
            <PdfColumn
              title="Zoho Invoice"
              icon={<FileText size={14} />}
              state={invoiceState}
              accentClass="text-cod"
              accentBgClass="bg-cod-bg"
            />
          </div>

          {!isLoading && (
            <button
              onClick={reset}
              className="text-[12px] font-medium text-muted underline underline-offset-2 hover:text-ink"
            >
              Look up another order
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PdfColumn — renders a single PDF panel (found, error, or loading placeholder)
// ---------------------------------------------------------------------------

function PdfColumn({
  title,
  icon,
  state,
  accentClass,
  accentBgClass,
}: {
  title: string;
  icon: React.ReactNode;
  state: PdfState;
  accentClass: string;
  accentBgClass: string;
}) {
  return (
    <div className="space-y-3">
      {/* Column header */}
      <div className="flex items-center justify-between gap-2">
        <div className={`flex items-center gap-1.5 text-[12px] font-medium ${accentClass}`}>
          {icon}
          {title}
          {state.status === "found" && (
            <span
              className={`ml-1 rounded-full ${accentBgClass} px-2.5 py-0.5 font-mono text-[11px]`}
            >
              {state.label}
            </span>
          )}
        </div>

        {state.status === "found" && (
          <div className="flex items-center gap-2">
            <a
              href={state.directUrl ?? state.blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-[12px] font-medium text-ink transition-colors hover:bg-canvas"
            >
              <ExternalLink size={12} />
              New tab
            </a>
            <a
              href={state.blobUrl}
              download={`${title.toLowerCase().replace(" ", "-")}.pdf`}
              className="flex items-center gap-1 rounded-lg bg-awb px-2.5 py-1 text-[12px] font-medium text-white shadow-soft transition-all hover:opacity-90"
            >
              <Download size={12} />
              Download
            </a>
          </div>
        )}
      </div>

      {/* Content */}
      {state.status === "loading" && (
        <div className="flex h-[200px] items-center justify-center gap-2 rounded-card border border-line bg-white shadow-soft text-muted">
          <Loader2 size={16} className={`animate-spin shrink-0 ${accentClass}`} />
          <span className="text-sm">Loading {title.toLowerCase()}…</span>
        </div>
      )}

      {state.status === "found" && (
        <div className="overflow-hidden rounded-card border border-line shadow-soft">
          <iframe
            src={state.blobUrl}
            className="h-[680px] w-full"
            title={title}
          />
        </div>
      )}

      {state.status === "error" && (
        <div className="rounded-card border border-fulfillment-bg bg-fulfillment-bg p-4">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-fulfillment" />
            <div className="space-y-0.5">
              <p className="text-[12px] font-medium text-fulfillment">
                {columnErrorTitle(state.reason, title)}
              </p>
              <p className="text-[12px] text-ink/80">{state.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function columnErrorTitle(reason: string, columnTitle: string): string {
  if (columnTitle === "Airway Bill") {
    switch (reason) {
      case "not_found": return "Order not found";
      case "no_tracking": return "No shipment yet";
      case "awb_error": return "AWB fetch failed";
      default: return "AWB unavailable";
    }
  }
  switch (reason) {
    case "not_found": return "No invoice found";
    case "zoho_error": return "Zoho error";
    default: return "Invoice unavailable";
  }
}
