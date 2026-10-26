"use client";

import { useMemo, useState } from "react";
import { StatusPill } from "@/components/portal/StatusPill";
import { STORE_LABELS } from "@/lib/stores/labels";
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
      <p className="rounded-card border border-line bg-white px-4 py-8 text-center text-fs13 text-muted shadow-soft">
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
            { key: 1, label: STORE_LABELS[1] },
            { key: 2, label: STORE_LABELS[2] },
          ] as const
        ).map((f) => (
          <button
            key={String(f.key)}
            type="button"
            onClick={() => setStoreFilter(f.key)}
            className={[
              "min-h-10 shrink-0 rounded-full border px-4 text-fs13 font-medium transition md:min-h-0 md:px-2.5 md:py-1 md:text-fs12",
              storeFilter === f.key
                ? "border-ink bg-ink text-white"
                : "border-line bg-white text-muted hover:bg-canvas",
            ].join(" ")}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="space-y-3 md:hidden">
        {filtered.map((row) => (
          <li
            key={row.id}
            className={[
              "rounded-card border border-line border-l-4 bg-white p-3.5 shadow-soft",
              row.storeId === 1 ? "border-l-primary" : "border-l-stock-b",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-mono text-fs14 font-semibold text-ink">{row.barcode || "—"}</p>
              <StatusPill tone={statusTone[row.status]}>{row.status}</StatusPill>
            </div>
            <p className="mt-0.5 text-fs13 text-muted">
              {row.storeId === 1 ? STORE_LABELS[1] : STORE_LABELS[2]} · {fmtWhen(row.createdAt)}
            </p>
            <p className="mt-2 font-mono text-fs14 tabular-nums text-ink">
              Ubex {row.ubexQty} · On hand {row.previousOnHand ?? "—"} → {row.newOnHand ?? row.ubexQty}
            </p>
            {row.error ? (
              <p className="mt-2 break-words rounded-lg bg-red-50 px-3 py-2 text-fs12 text-red-700">{row.error}</p>
            ) : null}
            {row.userEmail ? <p className="mt-1 text-fs12 text-muted">{row.userEmail}</p> : null}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-card border border-line bg-white shadow-soft md:block">
        <table className="w-full min-w-[780px] border-collapse text-left text-fs12">
          <thead>
            <tr className="border-b border-line bg-canvas text-fs11 font-medium uppercase tracking-wide max-md:normal-case max-md:tracking-normal text-muted">
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
                  row.storeId === 1 ? "border-l-2 border-l-primary" : "border-l-2 border-l-stock-b",
                ].join(" ")}
              >
                <td className="whitespace-nowrap px-3 py-2.5 font-mono text-muted">
                  {fmtWhen(row.createdAt)}
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-fs12 text-ink">
                    <span
                      className={[
                        "inline-block h-1.5 w-1.5 rounded-full",
                        row.storeId === 1 ? "bg-primary" : "bg-stock-b",
                      ].join(" ")}
                    />
                    {row.storeId === 1 ? STORE_LABELS[1] : STORE_LABELS[2]}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-mono text-fs12">{row.barcode || "—"}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">{row.ubexQty}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted">
                  {row.previousOnHand ?? "—"} → {row.newOnHand ?? row.ubexQty}
                </td>
                <td className="px-3 py-2.5">
                  <StatusPill tone={statusTone[row.status]}>{row.status}</StatusPill>
                  {row.error ? (
                    <p
                      className="mt-0.5 max-w-[200px] truncate text-fs11 text-[#DC2626]"
                      title={row.error}
                    >
                      {row.error}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-2.5 text-fs12 text-muted">{row.userEmail ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
