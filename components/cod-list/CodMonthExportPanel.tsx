"use client";

import { useCallback, useMemo, useState } from "react";
import { CalendarRange, Download, Mail } from "lucide-react";
import { getBahrainYearMonth, listMonthOptions, monthLabel } from "@/lib/cod/cod-list-month";
import { useCodExportFlow } from "@/lib/cod/use-cod-export-flow";
import { CodExportModal } from "./CodExportModal";

/**
 * Monthly COD export — separate from day picker. Does not change URL or table.
 */
export function CodMonthExportPanel() {
  const monthOptions = useMemo(() => listMonthOptions(24), []);
  const defaultMonth = getBahrainYearMonth();
  const [month, setMonth] = useState(defaultMonth);
  const flow = useCodExportFlow(useCallback(() => `month=${encodeURIComponent(month)}`, [month]));

  const selected = monthOptions.find((o) => o.value === month);
  const summaryLabel = selected?.label ?? monthLabel(month);
  const dayCount = selected?.dayCount ?? 0;

  return (
    <>
      <section className="flex flex-col gap-3 rounded-card border border-line bg-white/95 px-5 py-3.5 shadow-soft backdrop-blur-[2px] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <CalendarRange size={16} className="shrink-0 text-muted" />
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-ink">
              Full month export
              <span className="font-normal text-muted"> · {summaryLabel} · {dayCount} day{dayCount === 1 ? "" : "s"}</span>
            </p>
            <p className="text-[11px] text-muted">Separate from the table above — doesn&apos;t change your day selection.</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <select
            id="cod-month-select"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            aria-label="Export month"
            className="focus-ring rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-ink"
          >
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => flow.open("download")}
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-ink transition hover:bg-canvas"
          >
            <Download size={14} className="text-muted" />
            Download month
          </button>
          <button
            type="button"
            onClick={() => flow.open("email")}
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-ink transition hover:bg-canvas"
          >
            <Mail size={14} className="text-muted" />
            Email month
          </button>
        </div>
      </section>
      <CodExportModal
        flow={flow}
        title={flow.active === "download" ? "Download monthly Excel" : "Email monthly COD list"}
        description={
          flow.active === "email"
            ? "Send all COD orders for every collection day in the selected month. Recipients are in COD Settings."
            : "Excel includes all COD orders for each collection day in the month (Bahrain 14:00 windows)."
        }
        summary={
          <>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-muted">Month</p>
            <p className="mt-1 text-[13px] font-medium text-ink">
              {summaryLabel} · {dayCount} collection day{dayCount === 1 ? "" : "s"}
            </p>
          </>
        }
        confirmLabel={flow.active === "email" ? "Confirm and send" : "Confirm and download"}
        extraProgressNote="Large months may take a minute."
      />
    </>
  );
}
