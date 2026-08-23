"use client";

import { useMemo, useState } from "react";
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

type StoreFilter = "all" | 1 | 2;

export function StockBalanceHistoryTable({ rows }: { rows: StockRestockLogRow[] }) {
  const [storeFilter, setStoreFilter] = useState<StoreFilter>("all");

  const filtered = useMemo(() => {
    if (storeFilter === "all") return rows;
    return rows.filter((r) => r.storeId === storeFilter);
  }, [rows, storeFilter]);

  if (rows.length === 0) {
    return (
      <p className="rounded-card border border-line bg-white px-4 py-8 text-center text-[13px] text-muted shadow-soft">
        No restock actions logged yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: "all", label: "All stores" },
            { key: 1, label: "Store A" },
            { key: 2, label: "Store B" },
          ] as const
        ).map((f) => (
          <button
            key={String(f.key)}
            type="button"
            onClick={() => setStoreFilter(f.key)}
            className={[
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
              storeFilter === f.key
                ? "border-ink bg-ink text-white"
                : "border-line bg-white text-muted hover:bg-canvas",
            ].join(" ")}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-card border border-line bg-white shadow-soft">
        <table className="w-full min-w-[780px] border-collapse text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-line bg-canvas text-[11px] font-medium uppercase tracking-wide text-muted">
              <th className="px-3 py-2.5">When</th>
              <th className="px-3 py-2.5">Store</th>
              <th className="px-3 py-2.5">Barcode</th>
              <th className="px-3 py-2.5 text-right">Ubex</th>
              <th className="px-3 py-2.5 text-right">On hand</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">By</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.id}
                className={[
                  "border-b border-line last:border-0 hover:bg-canvas",
                  row.storeId === 1 ? "border-l-2 border-l-stock" : "border-l-2 border-l-stock-b",
                ].join(" ")}
              >
                <td className="whitespace-nowrap px-3 py-2.5 font-mono text-muted">
                  {fmtWhen(row.createdAt)}
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-ink">
                    <span
                      className={[
                        "inline-block h-1.5 w-1.5 rounded-full",
                        row.storeId === 1 ? "bg-stock" : "bg-stock-b",
                      ].join(" ")}
                    />
                    {row.storeId === 1 ? "A" : "B"}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-mono text-[12px]">{row.barcode || "—"}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">{row.ubexQty}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted">
                  {row.previousOnHand ?? "—"} → {row.newOnHand ?? row.ubexQty}
                </td>
                <td className="px-3 py-2.5">
                  <StatusPill tone={statusTone[row.status]}>{row.status}</StatusPill>
                  {row.error ? (
                    <p
                      className="mt-0.5 max-w-[200px] truncate text-[11px] text-[#C25151]"
                      title={row.error}
                    >
                      {row.error}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-2.5 text-[12px] text-muted">{row.userEmail ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
