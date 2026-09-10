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
      <section className="rounded-card border border-line border-l-4 border-l-cod bg-white/95 p-5 shadow-soft backdrop-blur-[2px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-cod">
              Monthly export
            </p>
            <h2 className="mt-1 flex items-center gap-2 text-[16px] font-medium text-ink">
              <CalendarRange size={18} className="shrink-0 text-cod" />
              Full month COD list
            </h2>
            <p className="mt-1 text-[12px] text-muted">
              {summaryLabel} · {dayCount} collection day{dayCount === 1 ? "" : "s"} · does not change
              the table above
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Uses the same Bahrain 14:00 windows as daily selection. May take longer for a full month.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[200px]">
            <label htmlFor="cod-month-select" className="text-[11px] font-medium uppercase tracking-wider text-muted">
              Month
            </label>
            <select
              id="cod-month-select"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="focus-ring w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] font-medium text-ink"
            >
              {monthOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => flow.open("download")}
            className="focus-ring inline-flex items-center gap-2 rounded-card border border-cod bg-cod px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90"
          >
            <Download size={15} />
            Download Excel
          </button>
          <button
            type="button"
            onClick={() => flow.open("email")}
            className="focus-ring inline-flex items-center gap-2 rounded-card border border-line bg-white px-4 py-2 text-[13px] font-medium text-ink transition hover:bg-canvas"
          >
            <Mail size={15} className="text-muted" />
            Email Ubex
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
