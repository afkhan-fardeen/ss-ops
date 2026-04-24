"use client";

import { Check, Copy, ExternalLink, Loader2, Send, AlertCircle } from "lucide-react";
import { useState } from "react";
import type { OrderRow } from "@/lib/orders/build-order-rows";
import { StatusPill, type StatusTone } from "@/components/portal/StatusPill";
import type { RowState, RowStateMap, RowStatus } from "@/hooks/useRowPushQueue";

const statusLabel: Record<RowStatus, string> = {
  pending: "Waiting for Ubex",
  matched: "Ready to push",
  fulfilled: "Fulfilled",
  error: "Error",
};

const statusTone: Record<RowStatus, StatusTone> = {
  pending: "amber",
  matched: "accent",
  fulfilled: "green",
  error: "red",
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  function copy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(value).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 1400); },
      () => {},
    );
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="focus-ring inline-flex h-6 w-6 items-center justify-center rounded text-[#999999] transition hover:bg-[#F7F7F7] hover:text-[#111111]"
      title={copied ? "Copied" : "Copy"}
      aria-label="Copy"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function PushButton({ row, state, onPush }: { row: OrderRow; state: RowState | undefined; onPush: (row: OrderRow) => Promise<boolean> }) {
  const status: RowStatus = state?.status ?? "pending";
  const busy = state?.busy === true;

  if (status === "fulfilled") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#4CAF50]">
        <Check size={13} strokeWidth={2.4} />
        Fulfilled
      </span>
    );
  }

  const disabled = busy || !row.ubexId;

  return (
    <button
      type="button"
      onClick={() => void onPush(row)}
      disabled={disabled}
      title={!row.ubexId ? "No Ubex tracking id yet" : status === "error" ? state?.message : "Push fulfillment to Shopify"}
      className={[
        "focus-ring inline-flex h-8 items-center gap-1.5 rounded-card border px-2.5 text-[12px] font-medium transition",
        status === "error"
          ? "border-[#C25151]/30 bg-[rgba(194,81,81,0.10)] text-[#C25151] hover:bg-[#C25151]/10"
          : "border-[#EBEBEB] bg-white text-[#111111] hover:bg-[#F7F7F7]",
        disabled ? "cursor-not-allowed opacity-60" : "",
      ].join(" ")}
    >
      {busy ? <Loader2 size={13} className="animate-spin-slow" /> : status === "error" ? <AlertCircle size={13} /> : <Send size={13} />}
      <span>{busy ? "Pushing…" : status === "error" ? "Retry" : "Push"}</span>
    </button>
  );
}

export function FulfillmentTable({ rows, stateMap, onPush }: {
  rows: OrderRow[];
  stateMap: RowStateMap;
  onPush: (row: OrderRow) => Promise<boolean>;
}) {
  if (rows.length === 0) {
    return (
      <div className="animate-fade-up space-y-3 rounded-card border border-[#EBEBEB] bg-white p-8 shadow-soft">
        <p className="text-center text-sm font-medium text-[#111111]">No orders match the current filter.</p>
        <p className="text-center text-[12px] text-[#999999]">
          Try widening the window (<code className="font-mono">FULFILLMENT_WINDOW_DAYS</code>) or switching filter.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up rounded-card border border-[#EBEBEB] bg-white shadow-soft">
      <div className="max-h-[65vh] overflow-auto">
      <table className="w-full min-w-[900px] border-collapse text-left text-[13px]">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-[#EBEBEB] bg-[#F7F7F7] text-[10px] font-semibold uppercase tracking-wider text-[#999999]">
            <th className="px-3 py-3">Order</th>
            <th className="px-3 py-3">Date</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">UBEX ID</th>
            <th className="px-3 py-3">Tracking</th>
            <th className="px-3 py-3">Total</th>
            <th className="px-3 py-3">Payment</th>
            <th className="px-3 py-3">Customer</th>
            <th className="px-3 py-3">Country</th>
            <th className="px-3 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const state = stateMap[r.orderName];
            const status: RowStatus = state?.status ?? "pending";
            const orderDateFmt = r.orderDate
              ? new Date(r.orderDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
              : "—";
            return (
              <tr
                key={r.orderName}
                className="border-b border-[#EBEBEB] text-[#111111] transition last:border-0 hover:bg-[#F7F7F7]"
                style={i < 6 ? { animation: "fadeUp 0.4s ease-out both", animationDelay: `${i * 30}ms` } : undefined}
              >
                <td className="px-3 py-3 font-mono text-[12px] font-medium">{r.orderName}</td>
                <td className="px-3 py-3 text-[12px] text-[#555555]">{orderDateFmt}</td>
                <td className="px-3 py-3">
                  <StatusPill tone={statusTone[status]}>{statusLabel[status]}</StatusPill>
                  {status === "error" && state?.message ? (
                    <div className="mt-1 max-w-[200px] truncate text-[11px] text-[#C25151]" title={state.message}>
                      {state.message}
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-3 font-mono text-[12px]">
                  {r.ubexId ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-[#111111]">{r.ubexId}</span>
                      <CopyButton value={r.ubexId} />
                    </span>
                  ) : <span className="text-[#999999]">—</span>}
                </td>
                <td className="px-3 py-3">
                  {r.trackingUrl ? (
                    <div className="inline-flex items-center gap-1.5">
                      <a href={r.trackingUrl} target="_blank" rel="noopener noreferrer"
                        className="focus-ring inline-flex items-center gap-1 rounded text-[12px] font-medium text-[#111111] hover:underline">
                        Open <ExternalLink size={11} />
                      </a>
                      <CopyButton value={r.trackingUrl} />
                    </div>
                  ) : <span className="text-[#999999]">—</span>}
                </td>
                <td className="px-3 py-3 font-mono text-[12px]">{r.totalGbp}</td>
                <td className="px-3 py-3 text-[12px]">
                  <span className={[
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                    r.isCod ? "bg-[rgba(240,183,67,0.12)] text-[#F0B743]" : "bg-[#F7F7F7] text-[#555555]",
                  ].join(" ")}>
                    {r.isCod ? "COD" : "Paid"}
                  </span>
                </td>
                <td className="px-3 py-3 text-[12px]">{r.customerName}</td>
                <td className="px-3 py-3 font-mono text-[12px]">{r.shippingCountry}</td>
                <td className="px-3 py-3 text-right">
                  <PushButton row={r} state={state} onPush={onPush} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
