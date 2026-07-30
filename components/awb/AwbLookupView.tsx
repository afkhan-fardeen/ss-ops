"use client";

import { useState } from "react";
import { FileSearch, ExternalLink, Download, Loader2, AlertCircle, Tag } from "lucide-react";

type IdleState = { status: "idle" };
type LoadingState = { status: "loading" };
type FoundState = {
  status: "found";
  pdfUrl: string;
  tracking: string;
  orderName: string;
  source: "db" | "live";
};
type ErrorState = {
  status: "error";
  message: string;
  reason: string;
  tracking?: string;
};

type LookupState = IdleState | LoadingState | FoundState | ErrorState;

type ApiResponse =
  | { ok: true; pdfUrl: string; tracking: string; orderName: string; source: "db" | "live" }
  | { ok: false; error: string; reason: string; tracking?: string };

export function AwbLookupView({ storeCount }: { storeCount: 1 | 2 }) {
  const [orderInput, setOrderInput] = useState("");
  const [store, setStore] = useState<1 | 2>(1);
  const [state, setState] = useState<LookupState>({ status: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = orderInput.trim();
    if (!trimmed) return;

    setState({ status: "loading" });

    try {
      const params = new URLSearchParams({ orderName: trimmed, store: String(store) });
      const res = await fetch(`/api/awb?${params.toString()}`);
      const json = (await res.json()) as ApiResponse;

      if (json.ok) {
        setState({
          status: "found",
          pdfUrl: json.pdfUrl,
          tracking: json.tracking,
          orderName: json.orderName,
          source: json.source,
        });
      } else {
        setState({
          status: "error",
          message: json.error,
          reason: json.reason,
          tracking: (json as { tracking?: string }).tracking,
        });
      }
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "An unexpected error occurred.",
        reason: "network",
      });
    }
  }

  function reset() {
    setState({ status: "idle" });
  }

  return (
    <div className="space-y-5">
      {/* Search form */}
      <div className="rounded-card border border-line bg-white p-5 shadow-soft">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label htmlFor="order-input" className="block text-[12px] font-medium uppercase tracking-wider text-muted">
              Order number
            </label>
            <input
              id="order-input"
              type="text"
              value={orderInput}
              onChange={(e) => setOrderInput(e.target.value)}
              placeholder="#1234 or 1234"
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-awb/40 focus:border-awb transition-colors"
              disabled={state.status === "loading"}
              autoComplete="off"
            />
          </div>

          {storeCount === 2 && (
            <div className="space-y-1.5">
              <label htmlFor="store-select" className="block text-[12px] font-medium uppercase tracking-wider text-muted">
                Store
              </label>
              <select
                id="store-select"
                value={store}
                onChange={(e) => setStore(Number(e.target.value) as 1 | 2)}
                className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-awb/40 focus:border-awb transition-colors"
                disabled={state.status === "loading"}
              >
                <option value={1}>Store 1</option>
                <option value={2}>Store 2</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={state.status === "loading" || !orderInput.trim()}
            className="flex items-center gap-2 rounded-lg bg-awb px-5 py-2 text-sm font-medium text-white shadow-soft transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state.status === "loading" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <FileSearch size={15} />
            )}
            {state.status === "loading" ? "Looking up…" : "Look up"}
          </button>
        </form>
      </div>

      {/* Loading state */}
      {state.status === "loading" && (
        <div className="flex items-center gap-3 rounded-card border border-line bg-white p-5 shadow-soft text-muted">
          <Loader2 size={18} className="animate-spin shrink-0 text-awb" />
          <span className="text-sm">Resolving order and fetching AWB…</span>
        </div>
      )}

      {/* Error state */}
      {state.status === "error" && (
        <div className="rounded-card border border-fulfillment-bg bg-fulfillment-bg p-5 shadow-soft">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-fulfillment" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-fulfillment">
                {errorTitle(state.reason)}
              </p>
              <p className="text-[13px] text-ink/80">{state.message}</p>
              {state.tracking && (
                <p className="mt-1 font-mono text-[12px] text-muted">
                  UBEX tracking: {state.tracking}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={reset}
            className="mt-3 text-[12px] font-medium text-fulfillment underline underline-offset-2 hover:opacity-80"
          >
            Try again
          </button>
        </div>
      )}

      {/* Found state */}
      {state.status === "found" && (
        <div className="space-y-4">
          {/* Metadata bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-white p-4 shadow-soft">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-awb-bg px-3 py-1 font-mono text-[12px] font-medium text-awb">
                <Tag size={11} />
                {state.orderName}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-awb-bg px-3 py-1 font-mono text-[12px] font-medium text-awb">
                {state.tracking}
              </span>
              {state.source === "live" && (
                <span className="rounded-full bg-cod-bg px-2.5 py-0.5 text-[11px] font-medium text-cod">
                  live match
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <a
                href={state.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-canvas"
              >
                <ExternalLink size={13} />
                Open in new tab
              </a>
              <a
                href={state.pdfUrl}
                download
                className="flex items-center gap-1.5 rounded-lg bg-awb px-3 py-1.5 text-[12px] font-medium text-white shadow-soft transition-all hover:opacity-90"
              >
                <Download size={13} />
                Download
              </a>
            </div>
          </div>

          {/* PDF preview */}
          <div className="overflow-hidden rounded-card border border-line shadow-soft">
            <iframe
              src={state.pdfUrl}
              className="h-[700px] w-full"
              title={`AWB for ${state.orderName}`}
            />
          </div>

          <button
            onClick={reset}
            className="text-[12px] font-medium text-muted underline underline-offset-2 hover:text-ink"
          >
            Look up another order
          </button>
        </div>
      )}
    </div>
  );
}

function errorTitle(reason: string): string {
  switch (reason) {
    case "not_found":
      return "Order not found";
    case "no_tracking":
      return "No shipment yet";
    case "awb_error":
      return "AWB fetch failed";
    default:
      return "Something went wrong";
  }
}
