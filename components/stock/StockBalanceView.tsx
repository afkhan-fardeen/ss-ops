"use client";

import { useMemo, useState } from "react";
import type { StockBalanceRow } from "@/lib/stock/build-balance-rows";
import { StatusPill, type StatusTone } from "@/components/portal/StatusPill";

type Props = {
  rows: StockBalanceRow[];
  locationName: string;
  locationId: number;
  fetchedAt: string;
  itemCount: number;
  summary: {
    matched: number;
    unlinked: number;
    ambiguous: number;
    skipped: number;
    mismatched: number;
  };
};

const statusLabel: Record<StockBalanceRow["status"], string> = {
  matched: "Matched",
  unlinked: "Unlinked",
  ambiguous: "Ambiguous",
  skipped: "Skipped",
};

const statusTone: Record<StockBalanceRow["status"], StatusTone> = {
  matched: "green",
  unlinked: "amber",
  ambiguous: "red",
  skipped: "neutral",
};

function fmt(n: number | null): string {
  if (n === null) return "—";
  return String(n);
}

function fmtDelta(n: number | null): string {
  if (n === null) return "—";
  if (n === 0) return "0";
  return n > 0 ? `+${n}` : String(n);
}

function deltaClass(delta: number | null): string {
  if (delta === null || delta === 0) return "text-[#555555]";
  return delta > 0 ? "text-[#C25151]" : "text-[#4CAF50]";
}

export function StockBalanceView({
  rows,
  locationName,
  locationId,
  fetchedAt,
  itemCount,
  summary,
}: Props) {
  const [mismatchesOnly, setMismatchesOnly] = useState(true);

  const visible = useMemo(() => {
    if (!mismatchesOnly) return rows;
    return rows.filter(
      (r) =>
        r.status === "unlinked" ||
        r.status === "ambiguous" ||
        (r.status === "matched" && r.delta !== null && r.delta !== 0),
    );
  }, [rows, mismatchesOnly]);

  const fetchedLabel = useMemo(() => {
    try {
      return new Date(fetchedAt).toLocaleString();
    } catch {
      return fetchedAt;
    }
  }, [fetchedAt]);

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-[#EBEBEB] bg-[#FFFBEB] px-4 py-3 text-[13px] text-[#92400E]">
        Preview — read only. No stock changes are made.
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-[#555555]">
          <input
            type="checkbox"
            checked={mismatchesOnly}
            onChange={(e) => setMismatchesOnly(e.target.checked)}
            className="h-4 w-4 rounded border-[#EBEBEB]"
          />
          Mismatches only
        </label>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="focus-ring rounded-card border border-[#EBEBEB] bg-white px-3 py-1.5 text-[12px] font-medium text-[#111111] transition hover:bg-[#F7F7F7]"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-card border border-[#EBEBEB] bg-white shadow-soft">
        <table className="w-full min-w-[880px] border-collapse text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-[#EBEBEB] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wide text-[#999999]">
              <th className="px-3 py-2.5 font-semibold">Product</th>
              <th className="px-3 py-2.5 font-semibold">Barcode</th>
              <th className="px-3 py-2.5 font-semibold text-right">Ubex</th>
              <th className="px-3 py-2.5 font-semibold text-right">On hand</th>
              <th className="px-3 py-2.5 font-semibold text-right">Available</th>
              <th className="px-3 py-2.5 font-semibold text-right">Committed</th>
              <th className="px-3 py-2.5 font-semibold text-right">Δ</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-[#999999]">
                  {mismatchesOnly ? "No mismatches in loaded items." : "No rows to show."}
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr
                  key={row.ubexId}
                  className="border-b border-[#F0F0F0] last:border-0 hover:bg-[#FAFAFA]"
                >
                  <td className="max-w-[200px] truncate px-3 py-2.5 font-medium text-[#111111]" title={row.productName}>
                    {row.productName}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-[#555555]">{row.barcode || "—"}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmt(row.ubexStock)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmt(row.shopifyOnHand)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmt(row.shopifyAvailable)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmt(row.shopifyCommitted)}</td>
                  <td className={`px-3 py-2.5 text-right font-medium tabular-nums ${deltaClass(row.delta)}`}>
                    {fmtDelta(row.delta)}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusPill tone={statusTone[row.status]}>{statusLabel[row.status]}</StatusPill>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[12px] text-[#999999]">
        Location: {locationName} (id {locationId}) · {itemCount} Ubex items · Matched {summary.matched},
        unlinked {summary.unlinked}, ambiguous {summary.ambiguous} · Fetched {fetchedLabel}
      </p>

      <p className="text-[11.5px] text-[#BBBBBB]">
        Restock — Phase 2 (not available in this preview).
      </p>
    </div>
  );
}
