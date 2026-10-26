"use client";

import { Check, ExternalLink, Loader2, Send, AlertCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { OrderRow } from "@/lib/orders/build-order-rows";
import { StatusPill, type StatusTone } from "@/components/portal/StatusPill";
import type { RowState, RowStateMap, RowStatus } from "@/hooks/useRowPushQueue";
import { easeOut, rowExit } from "@/lib/motion";
import { CopyButton } from "@/components/ui/CopyButton";
import { formatOrderDate } from "@/lib/datetime/format-order-date";

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

function PushButton({ row, state, onPush }: { row: OrderRow; state: RowState | undefined; onPush: (row: OrderRow) => Promise<boolean> }) {
  const status: RowStatus = state?.status ?? "pending";
  const busy = state?.busy === true;

  if (status === "fulfilled") {
    return (
      <span className="inline-flex items-center gap-1.5 text-fs12 font-medium text-[#16A34A]">
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
        "focus-ring inline-flex h-11 items-center justify-center gap-1.5 rounded-card border px-3 text-fs13 font-medium transition md:h-8 md:px-2.5 md:text-fs12",
        status === "error"
          ? "border-[#DC2626]/30 bg-[rgba(220,38,38,0.10)] text-[#DC2626] hover:bg-[#DC2626]/10"
          : status === "matched" && !disabled
            ? "border-primary bg-primary text-white hover:bg-primary/90 active:bg-indigo-800"
            : "border-line bg-white text-ink hover:bg-canvas",
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
      <div className="animate-fade-up space-y-3 rounded-card border border-line bg-white p-8 shadow-soft">
        <p className="text-center text-sm font-medium text-ink">No orders match the current filter.</p>
        <p className="text-center text-fs12 text-muted">
          Try widening the window (<code className="font-mono">FULFILLMENT_WINDOW_DAYS</code>) or switching filter.
        </p>
      </div>
    );
  }

  return (
    <>
    <MobileOrderList rows={rows} stateMap={stateMap} onPush={onPush} />
    <div className="hidden animate-fade-up rounded-card border border-line bg-white shadow-soft md:block">
      <div className="max-h-[65vh] overflow-auto">
      <table className="w-full min-w-[900px] border-collapse text-left text-fs13">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-line bg-canvas text-fs11 font-semibold uppercase tracking-wide max-md:normal-case max-md:tracking-normal text-muted">
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
          <AnimatePresence initial={false} mode="popLayout">
          {rows.map((r, i) => {
            const state = stateMap[r.orderName];
            const status: RowStatus = state?.status ?? "pending";
            const orderDateFmt = formatOrderDate(r.orderDate);
            return (
              <motion.tr
                key={r.orderName}
                layout
                exit={rowExit}
                transition={easeOut}
                className="border-b border-line text-ink transition last:border-0 hover:bg-canvas"
                style={i < 6 ? { animation: "fadeUp 0.4s ease-out both", animationDelay: `${i * 30}ms` } : undefined}
              >
                <td className="px-3 py-3 font-mono text-fs12 font-medium">{r.orderName}</td>
                <td className="px-3 py-3 text-fs12 text-muted">{orderDateFmt}</td>
                <td className="px-3 py-3">
                  <StatusPill tone={statusTone[status]}>{statusLabel[status]}</StatusPill>
                  {status === "error" && state?.message ? (
                    <div className="mt-1 max-w-[200px] truncate text-fs11 text-[#DC2626]" title={state.message}>
                      {state.message}
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-3 font-mono text-fs12">
                  {r.ubexId ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-ink">{r.ubexId}</span>
                      <CopyButton value={r.ubexId} />
                    </span>
                  ) : <span className="text-muted">—</span>}
                </td>
                <td className="px-3 py-3">
                  {r.trackingUrl ? (
                    <div className="inline-flex items-center gap-1.5">
                      <a href={r.trackingUrl} target="_blank" rel="noopener noreferrer"
                        className="focus-ring inline-flex items-center gap-1 rounded text-fs12 font-medium text-ink hover:underline">
                        Open <ExternalLink size={11} />
                      </a>
                      <CopyButton value={r.trackingUrl} />
                    </div>
                  ) : <span className="text-muted">—</span>}
                </td>
                <td className="px-3 py-3 font-mono text-fs12">{r.total}</td>
                <td className="px-3 py-3 text-fs12">
                  <span className={[
                    "inline-flex items-center rounded-full px-2 py-0.5 text-fs11 font-medium",
                    r.isCod ? "bg-[rgba(217,119,6,0.12)] text-[#D97706]" : "bg-canvas text-muted",
                  ].join(" ")}>
                    {r.isCod ? "COD" : "Paid"}
                  </span>
                </td>
                <td className="px-3 py-3 text-fs12">{r.customerName}</td>
                <td className="px-3 py-3 font-mono text-fs12">{r.shippingCountry}</td>
                <td className="px-3 py-3 text-right">
                  <PushButton row={r} state={state} onPush={onPush} />
                </td>
              </motion.tr>
            );
          })}
          </AnimatePresence>
        </tbody>
      </table>
      </div>
    </div>
    </>
  );
}

/** Phone layout: one card per order, full-width Push button at thumb height. */
function MobileOrderList({
  rows,
  stateMap,
  onPush,
}: {
  rows: OrderRow[];
  stateMap: RowStateMap;
  onPush: (row: OrderRow) => Promise<boolean>;
}) {
  return (
    <ul className="space-y-3 md:hidden">
      {rows.map((r) => {
        const state = stateMap[r.orderName];
        const status: RowStatus = state?.status ?? "pending";
        return (
          <li key={r.orderName} className="rounded-card border border-line bg-white p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[15px] font-semibold text-ink">{r.orderName}</p>
                <p className="mt-0.5 text-fs13 text-muted">{formatOrderDate(r.orderDate)}</p>
              </div>
              <StatusPill tone={statusTone[status]}>{statusLabel[status]}</StatusPill>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-fs13">
              <div className="col-span-2">
                <dt className="text-muted">Customer</dt>
                <dd className="font-medium text-ink">
                  {r.customerName} <span className="font-mono text-muted">· {r.shippingCountry}</span>
                </dd>
              </div>
              <div>
                <dt className="text-muted">Total</dt>
                <dd className="font-mono text-ink">{r.total}</dd>
              </div>
              <div>
                <dt className="text-muted">Payment</dt>
                <dd>
                  <span
                    className={[
                      "inline-flex items-center rounded-full px-2 py-0.5 text-fs12 font-medium",
                      r.isCod ? "bg-amber-50 text-amber-700" : "bg-canvas text-muted",
                    ].join(" ")}
                  >
                    {r.isCod ? "COD" : "Paid"}
                  </span>
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted">Ubex ID</dt>
                <dd className="flex items-center gap-2 font-mono text-ink">
                  {r.ubexId ? (
                    <>
                      <span className="break-all">{r.ubexId}</span>
                      <CopyButton value={r.ubexId} />
                      {r.trackingUrl ? (
                        <a
                          href={r.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-sans text-fs13 font-medium text-primary"
                        >
                          Track <ExternalLink size={12} />
                        </a>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-muted">Not matched yet</span>
                  )}
                </dd>
              </div>
            </dl>

            {status === "error" && state?.message ? (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-fs13 text-red-700">{state.message}</p>
            ) : null}

            <div className="mt-3 [&>*]:w-full">
              <PushButton row={r} state={state} onPush={onPush} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
