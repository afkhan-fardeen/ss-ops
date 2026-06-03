"use client";

import { StatusPill } from "@/components/portal/StatusPill";
import type { StockRestockLogRow } from "@/lib/stock/load-restock-history";

function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

const statusTone = {
  success: "green",
  error: "red",
  skipped: "neutral",
} as const;

export function StockBalanceHistoryTable({ rows }: { rows: StockRestockLogRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-card border border-[#EBEBEB] bg-white px-4 py-8 text-center text-[13px] text-[#999999] shadow-soft">
        No restock actions logged yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-[#EBEBEB] bg-white shadow-soft">
      <table className="w-full min-w-[720px] border-collapse text-left text-[12.5px]">
        <thead>
          <tr className="border-b border-[#EBEBEB] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wide text-[#999999]">
            <th className="px-3 py-2.5">When</th>
            <th className="px-3 py-2.5">Barcode</th>
            <th className="px-3 py-2.5 text-right">Ubex</th>
            <th className="px-3 py-2.5 text-right">On hand</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5">By</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-[#F0F0F0] last:border-0 hover:bg-[#FAFAFA]">
              <td className="whitespace-nowrap px-3 py-2.5 text-[#555555]">{fmtWhen(row.createdAt)}</td>
              <td className="px-3 py-2.5 font-mono text-[12px]">{row.barcode || "—"}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{row.ubexQty}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-[#555555]">
                {row.previousOnHand ?? "—"} → {row.newOnHand ?? row.ubexQty}
              </td>
              <td className="px-3 py-2.5">
                <StatusPill tone={statusTone[row.status]}>{row.status}</StatusPill>
                {row.error ? (
                  <p className="mt-0.5 max-w-[200px] truncate text-[11px] text-[#C25151]" title={row.error}>
                    {row.error}
                  </p>
                ) : null}
              </td>
              <td className="px-3 py-2.5 text-[12px] text-[#555555]">{row.userEmail ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
