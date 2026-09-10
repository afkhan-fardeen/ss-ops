"use client";

import { useCallback } from "react";
import { Download, Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { getLastNWindows, shortWindowLabel } from "@/lib/datetime/collection-window";
import { useCodExportFlow } from "@/lib/cod/use-cod-export-flow";
import { CodExportModal } from "./CodExportModal";
import type { CodDateOption } from "./CodDatePicker";

function buildDefaultDateOptions(): CodDateOption[] {
  return getLastNWindows(14).map((w) => ({
    dateKey: w.dateKey,
    label: shortWindowLabel(w),
    isToday: w.isToday,
  }));
}

function buildListQueryString(sp: URLSearchParams): string {
  const d = sp.get("dates");
  const o = sp.get("date");
  const q = new URLSearchParams();
  if (d) q.set("dates", d);
  else if (o) q.set("date", o);
  return q.toString();
}

function selectionLines(sp: URLSearchParams, options: CodDateOption[]): string[] {
  const raw = sp.get("dates");
  if (raw) {
    return raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((k) => options.find((o) => o.dateKey === k)?.label ?? k);
  }
  const one = sp.get("date");
  if (one?.trim()) {
    const k = one.trim();
    return [options.find((o) => o.dateKey === k)?.label ?? k];
  }
  const t = options.find((o) => o.isToday);
  return t ? [`${t.label} (current window)`] : ["Current collection window"];
}

/** `dateOptions` optional: defaults to last 14 windows, newest (today) first → older. */
export function CodListFloatingActions({ dateOptions: dateOptionsProp }: { dateOptions?: CodDateOption[] }) {
  const dateOptions = dateOptionsProp ?? buildDefaultDateOptions();
  const searchParams = useSearchParams();
  const flow = useCodExportFlow(useCallback(() => buildListQueryString(searchParams), [searchParams]));
  const lines = selectionLines(searchParams, dateOptions);

  return (
    <>
      <div className="max-w-full shrink-0">
        <div className="inline-flex max-w-full min-w-0 divide-x divide-line overflow-hidden rounded-card border border-line bg-white/95 shadow-soft backdrop-blur-[2px]">
          <button
            type="button"
            onClick={() => flow.open("download")}
            className="focus-ring inline-flex min-h-[2.25rem] items-center justify-center gap-1.5 bg-white px-2.5 py-1.5 text-[11px] font-medium text-ink transition hover:bg-canvas sm:px-3 sm:py-2 sm:text-[12px]"
          >
            <Download size={15} strokeWidth={2} className="shrink-0 text-muted sm:h-4 sm:w-4" />
            <span className="whitespace-nowrap">Download Excel</span>
          </button>
          <button
            type="button"
            onClick={() => flow.open("email")}
            className="focus-ring inline-flex min-h-[2.25rem] items-center justify-center gap-1.5 bg-white px-2.5 py-1.5 text-[11px] font-medium text-ink transition hover:bg-canvas sm:px-3 sm:py-2 sm:text-[12px]"
          >
            <Mail size={15} strokeWidth={2} className="shrink-0 text-muted sm:h-4 sm:w-4" />
            <span className="whitespace-nowrap">Email Ubex</span>
          </button>
        </div>
      </div>
      <CodExportModal
        flow={flow}
        title={flow.active === "download" ? "Download Excel" : "Email to Ubex"}
        description={
          flow.active === "email"
            ? "Send the COD list for the same dates as this page. Recipients are set in Cod settings."
            : "Download matches the same COD selection as the table below."
        }
        summary={
          <>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-muted">Selected dates</p>
            <ul className="mt-1.5 list-inside list-disc text-[12px] text-ink">
              {lines.map((line, i) => (
                <li key={`${i}-${line}`} className="[text-wrap:balance]">
                  {line}
                </li>
              ))}
            </ul>
          </>
        }
        confirmLabel={flow.active === "email" ? "Confirm and send" : "Confirm and download"}
      />
    </>
  );
}
