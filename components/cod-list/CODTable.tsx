"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import type { CodRow } from "@/lib/cod/build-rows";
import { StatusPill } from "@/components/portal/StatusPill";

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
      className="focus-ring inline-flex h-6 w-6 items-center justify-center rounded text-[#999999] transition hover:bg-[#F7F7F7] hover:text-[#111111]"
      title={copied ? "Copied" : "Copy"}
      aria-label="Copy"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

export function CODTable({
  rows,
  ordersScannedInWindow,
}: {
  rows: CodRow[];
  ordersScannedInWindow: number;
}) {
  if (rows.length === 0) {
    return (
      <div className="animate-fade-up space-y-3 rounded-card border border-[#EBEBEB] bg-white p-8 shadow-soft">
        <p className="text-center text-sm font-medium text-[#111111]">No COD orders in this collection window.</p>
        {ordersScannedInWindow > 0 ? (
          <div className="mx-auto max-w-lg rounded-card border border-[#F0B743]/25 bg-[rgba(240,183,67,0.12)] p-4 text-left text-[13px] text-[#111111]">
            <p className="font-medium text-[#F0B743]">
              Shopify returned {ordersScannedInWindow} order(s) in the window, but none matched COD.
            </p>
            <p className="mt-2 text-[12px] text-[#555555]">
              Open an order in Admin and check <strong>Payment method</strong>. This app looks for &quot;cash on
              delivery&quot;, &quot;(COD)&quot;, or similar in <code className="font-mono">payment_gateway_names</code>{" "}
              / <code className="font-mono">gateway</code>. If yours is named differently (e.g. only &quot;Manual&quot;),
              extend <code className="font-mono">SHOPIFY_COD_MATCH_EXTRA</code> in <code className="font-mono">.env</code>.
            </p>
          </div>
        ) : (
          <p className="text-center text-[12px] text-[#999999]">
            There were no orders at all in the Bahrain 14:00–14:00 window.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-up overflow-x-auto rounded-card border border-[#EBEBEB] bg-white shadow-soft">
      <table className="w-full min-w-[1000px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-[#EBEBEB] bg-[#F7F7F7] text-[10px] font-semibold uppercase tracking-wider text-[#999999]">
            <th className="px-3 py-3">Order</th>
            <th className="hidden px-3 py-3 sm:table-cell">Order Date</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">UBEX ID</th>
            <th className="px-3 py-3">Tracking</th>
            <th className="hidden px-3 py-3 md:table-cell">Outstanding</th>
            <th className="px-3 py-3">To Collect</th>
            <th className="px-3 py-3">Customer</th>
            <th className="hidden min-w-[200px] px-3 py-3 lg:table-cell">Address</th>
            <th className="px-3 py-3">Country</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const hasUbex = Boolean(r.ubexId);
            const orderDateFmt = r.orderDate
              ? new Date(r.orderDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
              : "—";
            return (
              <tr
                key={r.orderName}
                className="border-b border-[#EBEBEB] text-[#111111] transition last:border-0 hover:bg-[#F7F7F7]"
                style={
                  i < 6
                    ? { animation: "fadeUp 0.4s ease-out both", animationDelay: `${i * 30}ms` }
                    : undefined
                }
              >
                <td className="px-3 py-3 font-mono text-[12px] font-medium">{r.orderName}</td>
                <td className="hidden px-3 py-3 text-[12px] text-[#555555] sm:table-cell">{orderDateFmt}</td>
                <td className="px-3 py-3">
                  {hasUbex ? (
                    <StatusPill tone="green">Matched</StatusPill>
                  ) : (
                    <StatusPill tone="amber">Waiting for Ubex</StatusPill>
                  )}
                </td>
                <td className="px-3 py-3 font-mono text-[12px]">
                  {r.ubexId ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-[#111111]">{r.ubexId}</span>
                      <CopyButton value={r.ubexId} />
                    </span>
                  ) : (
                    <span className="text-[#999999]">—</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  {r.trackingUrl ? (
                    <div className="inline-flex items-center gap-1.5">
                      <a
                        href={r.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="focus-ring inline-flex items-center gap-1 rounded text-[12px] font-medium text-[#111111] hover:underline"
                      >
                        Open
                        <ExternalLink size={11} />
                      </a>
                      <CopyButton value={r.trackingUrl} />
                    </div>
                  ) : (
                    <span className="text-[#999999]">—</span>
                  )}
                </td>
                <td className="hidden px-3 py-3 font-mono text-[12px] md:table-cell">{r.outstandingGbp}</td>
                <td className="px-3 py-3 font-mono text-[12px]" title={r.currencyWarning}>
                  {r.toCollect}
                  {r.currencyWarning ? <span className="ml-1 text-[#C25151]">!</span> : null}
                </td>
                <td className="px-3 py-3 text-[12px]">{r.customerName}</td>
                <td className="hidden px-3 py-3 text-[12px] text-[#555555] lg:table-cell">{r.shippingAddress}</td>
                <td className="px-3 py-3 font-mono text-[12px]">{r.shippingCountry}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
