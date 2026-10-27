"use client";

import { useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import type { StockAlertRow } from "@/lib/stock/compute-stock-alerts";
import { StatusPill } from "@/components/portal/StatusPill";
import { btn } from "@/components/ui/button-styles";

type Tab = "all" | "critical" | "warning";

function daysLabel(row: StockAlertRow): string {
  if (row.ubexStock === 0) return "Out of stock";
  if (row.daysRemaining === null) return "—";
  return `${Math.max(0, Math.round(row.daysRemaining))}d left`;
}

export function StockAlertsView({
  rows,
  scannedCount,
  fetchedAt,
  loading,
  onRefresh,
}: {
  rows: StockAlertRow[];
  scannedCount: number;
  fetchedAt: string;
  loading: boolean;
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState<Tab>("all");

  const criticalCount = useMemo(() => rows.filter((r) => r.severity === "critical").length, [rows]);
  const warningCount = rows.length - criticalCount;

  const filtered = useMemo(() => {
    if (tab === "all") return rows;
    return rows.filter((r) => r.severity === tab);
  }, [rows, tab]);

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-line border-l-4 border-l-primary bg-white p-4 shadow-soft">
        <p className="text-body text-ink">
          Scanned {scannedCount} linked products · fetched {new Date(fetchedAt).toLocaleString()}
        </p>
        <p className="mt-1 text-body-sm text-muted">
          Flags products running low or out, based on 14-day sales velocity across both stores —
          not just a flat stock count.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1 rounded-control border border-line bg-canvas p-1">
          <TabButton active={tab === "all"} label={`All (${rows.length})`} onClick={() => setTab("all")} />
          <TabButton
            active={tab === "critical"}
            label={`Critical (${criticalCount})`}
            onClick={() => setTab("critical")}
          />
          <TabButton
            active={tab === "warning"}
            label={`Warning (${warningCount})`}
            onClick={() => setTab("warning")}
          />
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={onRefresh}
          className={btn("secondary", "sm")}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Rescan
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-card border border-line bg-white px-4 py-10 text-center text-body text-muted shadow-soft">
          {rows.length === 0
            ? "Nothing flagged — every linked product has healthy stock for its sales pace."
            : "Nothing in this tab."}
        </p>
      ) : (
        <>
        <ul className="space-y-3 md:hidden">
          {filtered.map((row) => (
            <li key={row.ubexId} className="rounded-card border border-line bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 text-body-lg font-medium text-ink">{row.productName}</p>
                <StatusPill tone={row.severity === "critical" ? "red" : "amber"}>
                  {row.severity === "critical" ? "Critical" : "Warning"}
                </StatusPill>
              </div>
              <p className="mt-0.5 truncate font-mono text-body-sm text-muted">
                {row.sku || "—"} · {row.barcode || "no barcode"}
              </p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-control bg-canvas px-1 py-2">
                  <dt className="text-caption text-muted">Ubex stock</dt>
                  <dd className="text-body-lg font-semibold tabular-nums text-ink">{row.ubexStock}</dd>
                </div>
                <div className="rounded-control bg-canvas px-1 py-2">
                  <dt className="text-caption text-muted">Sold (14d)</dt>
                  <dd className="text-body-lg font-semibold tabular-nums text-ink">{row.unitsSold14d}</dd>
                </div>
                <div className="rounded-control bg-canvas px-1 py-2">
                  <dt className="text-caption text-muted">Runway</dt>
                  <dd className="text-body-lg font-semibold tabular-nums text-ink">{daysLabel(row)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-hidden rounded-card border border-line bg-white shadow-soft md:block xl:overflow-clip">
          <div className="overflow-x-auto xl:overflow-visible">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead className="z-10 xl:sticky xl:top-14 bg-canvas text-caption font-semibold uppercase tracking-wide max-md:normal-case max-md:tracking-normal text-muted">
                <tr className="border-b border-line">
                  <th className="px-3 py-3">Product</th>
                  <th className="px-3 py-3 text-right">Ubex stock</th>
                  <th className="px-3 py-3 text-right">Sold (14d)</th>
                  <th className="px-3 py-3 text-right">Runway</th>
                  <th className="px-3 py-3">Severity</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.ubexId} className="border-b border-line text-body last:border-0">
                    <td className="min-w-[220px] px-3 py-3">
                      <p className="line-clamp-1 font-medium text-ink">{row.productName}</p>
                      <p className="mt-0.5 font-mono text-caption text-muted">
                        {row.sku || "—"} · {row.barcode || "no barcode"}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink">
                      {row.ubexStock}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink">
                      {row.unitsSold14d}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink">
                      {daysLabel(row)}
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill tone={row.severity === "critical" ? "red" : "amber"}>
                        {row.severity === "critical" ? "Critical" : "Warning"}
                      </StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
    </div>
  );
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-control px-3 py-2 text-body font-medium transition",
        active ? "bg-white text-ink shadow-soft" : "text-muted hover:text-ink",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
