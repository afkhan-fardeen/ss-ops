"use client";

import { Check, Copy, ExternalLink, Loader2, Send, AlertCircle } from "lucide-react";
import { useState } from "react";
import type { CodRow } from "@/lib/cod/build-rows";
import { StatusPill, type StatusTone } from "@/components/portal/StatusPill";
import type { RowState, RowStateMap, RowStatus } from "./CODListView";

const statusLabel: Record<RowStatus, string> = {
  pending: "No tracking",
  matched: "Ready to push",
  fulfilled: "Fulfilled",
  error: "Error",
};

const statusTone: Record<RowStatus, StatusTone> = {
  pending: "neutral",
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
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      },
      () => {},
    );
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="focus-ring inline-flex h-6 w-6 items-center justify-center rounded text-portal-text3 transition hover:bg-portal-bg3 hover:text-portal-text"
      title={copied ? "Copied" : "Copy"}
      aria-label="Copy"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function PushButton({
  row,
  state,
  onPush,
}: {
  row: CodRow;
  state: RowState | undefined;
  onPush: (row: CodRow) => Promise<boolean>;
}) {
  const status: RowStatus = state?.status ?? "pending";
  const busy = state?.busy === true;

  if (status === "fulfilled") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-portal-green">
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
          ? "border-portal-red/30 bg-portal-redSoft text-portal-red hover:bg-portal-red/10"
          : "border-portal-border bg-portal-bg2 text-portal-text hover:bg-portal-bg3",
        disabled ? "cursor-not-allowed opacity-60" : "",
      ].join(" ")}
    >
      {busy ? (
        <Loader2 size={13} className="animate-spin-slow" />
      ) : status === "error" ? (
        <AlertCircle size={13} />
      ) : (
        <Send size={13} />
      )}
      <span>{busy ? "Pushing…" : status === "error" ? "Retry" : "Push"}</span>
    </button>
  );
}

export function CODTable({
  rows,
  ordersScannedInWindow,
  stateMap,
  onPush,
}: {
  rows: CodRow[];
  ordersScannedInWindow: number;
  stateMap: RowStateMap;
  onPush: (row: CodRow) => Promise<boolean>;
}) {
  if (rows.length === 0) {
    return (
      <div className="animate-fade-up space-y-3 rounded-card border border-portal-border bg-portal-bg2 p-8 shadow-soft">
        <p className="text-center text-sm font-medium text-portal-text">No COD orders in this collection window.</p>
        {ordersScannedInWindow > 0 ? (
          <div className="mx-auto max-w-lg rounded-card border border-portal-amber/25 bg-portal-amberSoft p-4 text-left text-[13px] text-portal-text">
            <p className="font-medium text-portal-amber">
              Shopify returned {ordersScannedInWindow} order(s) in the window, but none matched COD.
            </p>
            <p className="mt-2 text-[12px] text-portal-text2">
              Open an order in Admin and check <strong>Payment method</strong>. This app looks for &quot;cash on
              delivery&quot;, &quot;(COD)&quot;, or similar in <code className="font-mono">payment_gateway_names</code>{" "}
              / <code className="font-mono">gateway</code>. If yours is named differently (e.g. only &quot;Manual&quot;),
              extend <code className="font-mono">SHOPIFY_COD_MATCH_EXTRA</code> in <code className="font-mono">.env</code>.
            </p>
          </div>
        ) : (
          <p className="text-center text-[12px] text-portal-text3">
            There were no orders at all in the Bahrain 14:00-14:00 window.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-up overflow-x-auto rounded-card border border-portal-border bg-portal-bg2 shadow-soft">
      <table className="w-full min-w-[1100px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-portal-border bg-portal-bg3/60 text-[10px] font-semibold uppercase tracking-wider text-portal-text3">
            <th className="px-3 py-3">Order</th>
            <th className="hidden px-3 py-3 sm:table-cell">Order Date</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">UBEX ID</th>
            <th className="px-3 py-3">Tracking</th>
            <th className="hidden px-3 py-3 md:table-cell">Outstanding</th>
            <th className="px-3 py-3">To Collect</th>
            <th className="px-3 py-3">Customer</th>
            <th className="hidden min-w-[220px] px-3 py-3 lg:table-cell">Address</th>
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
                className="border-b border-portal-border/70 text-portal-text transition last:border-0 hover:bg-portal-bg3/40"
                style={
                  i < 6
                    ? { animation: "fadeUp 0.4s ease-out both", animationDelay: `${i * 30}ms` }
                    : undefined
                }
              >
                <td className="px-3 py-3 font-mono text-[12px] font-medium">{r.orderName}</td>
                <td className="hidden px-3 py-3 text-[12px] text-portal-text2 sm:table-cell">{orderDateFmt}</td>
                <td className="px-3 py-3">
                  <StatusPill tone={statusTone[status]}>{statusLabel[status]}</StatusPill>
                  {status === "error" && state?.message ? (
                    <div className="mt-1 max-w-[240px] truncate text-[11px] text-portal-red" title={state.message}>
                      {state.message}
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-3 font-mono text-[12px]">
                  {r.ubexId ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-portal-text">{r.ubexId}</span>
                      <CopyButton value={r.ubexId} />
                    </span>
                  ) : (
                    <span className="text-portal-text3">—</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  {r.trackingUrl ? (
                    <div className="inline-flex items-center gap-1.5">
                      <a
                        href={r.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="focus-ring inline-flex items-center gap-1 rounded-card text-[12px] font-medium text-portal-accent hover:underline"
                      >
                        Open
                        <ExternalLink size={11} />
                      </a>
                      <CopyButton value={r.trackingUrl} />
                    </div>
                  ) : (
                    <span className="text-portal-text3">—</span>
                  )}
                </td>
                <td className="hidden px-3 py-3 font-mono text-[12px] md:table-cell">{r.outstandingGbp}</td>
                <td className="px-3 py-3 font-mono text-[12px]" title={r.currencyWarning}>
                  {r.toCollect}
                  {r.currencyWarning ? <span className="ml-1 text-portal-red">!</span> : null}
                </td>
                <td className="px-3 py-3 text-[12px]">{r.customerName}</td>
                <td className="hidden px-3 py-3 text-[12px] text-portal-text2 lg:table-cell">{r.shippingAddress}</td>
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
  );
}
