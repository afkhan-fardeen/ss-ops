"use client";

import { Check, Copy } from "lucide-react";
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

export function CODTable({ rows, ordersScannedInWindow: _n }: { rows: CodRow[]; ordersScannedInWindow: number }) {
  void _n;
  if (rows.length === 0) {
    return (
      <div className="animate-fade-up space-y-3 rounded-card border border-[#EBEBEB] bg-white p-8 shadow-soft">
        <p className="text-center text-sm font-medium text-[#111111]">No COD orders for the selected day(s).</p>
        <p className="text-center text-[12px] text-[#999999]">
          Add another day above or check Shopify. Custom COD names: <code className="font-mono">SHOPIFY_COD_MATCH_EXTRA</code> in <code className="font-mono">.env</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up rounded-card border border-[#EBEBEB] bg-white shadow-soft">
      <div className="max-h-[65vh] overflow-auto">
      <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-[#EBEBEB] bg-[#F7F7F7] text-[10px] font-semibold uppercase tracking-wider text-[#999999]">
            <th className="px-3 py-3">Order</th>
            <th className="px-3 py-3">Date</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">UBEX ID</th>
            <th className="px-3 py-3">Outstanding</th>
            <th className="px-3 py-3">To Collect</th>
            <th className="px-3 py-3">Customer</th>
            <th className="min-w-[180px] px-3 py-3">Address</th>
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
                className="animate-cod-row border-b border-[#EBEBEB] text-[#111111] transition last:border-0 hover:bg-[#F7F7F7]"
                style={{ animationDelay: `${Math.min(i, 24) * 22}ms` }}
              >
                <td className="px-3 py-3 font-mono text-[12px] font-medium">{r.orderName}</td>
                <td className="px-3 py-3 text-[12px] text-[#555555]">{orderDateFmt}</td>
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
                  ) : <span className="text-[#999999]">—</span>}
                </td>
                <td className="px-3 py-3 font-mono text-[12px]">{r.outstandingGbp}</td>
                <td className="px-3 py-3 font-mono text-[12px]" title={r.currencyWarning}>
                  {r.toCollect}
                  {r.currencyWarning ? <span className="ml-1 text-[#C25151]">!</span> : null}
                </td>
                <td className="px-3 py-3 text-[12px]">{r.customerName}</td>
                <td className="px-3 py-3 text-[12px] text-[#555555]">{r.shippingAddress}</td>
                <td className="px-3 py-3 font-mono text-[12px]">{r.shippingCountry}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
