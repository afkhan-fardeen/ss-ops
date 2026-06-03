"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarRange, Check, Download, Loader2, Mail, X } from "lucide-react";
import { getBahrainYearMonth, listMonthOptions, monthLabel } from "@/lib/cod/cod-list-month";

const MODAL_Z = 280;

type ActiveModal = "download" | "email" | null;
type StepState = "idle" | "prepare" | "fetch" | "finish" | "done" | "error";

function progressRowState(s: StepState, index: 0 | 1 | 2): "wait" | "active" | "done" {
  if (s === "done" || s === "error" || s === "idle") return "wait";
  if (s !== "prepare" && s !== "fetch" && s !== "finish") return "wait";
  const i = s === "prepare" ? 0 : s === "fetch" ? 1 : 2;
  if (index < i) return "done";
  if (index === i) return "active";
  return "wait";
}

/**
 * Monthly COD export — separate from day picker. Does not change URL or table.
 */
export function CodMonthExportPanel() {
  const monthOptions = useMemo(() => listMonthOptions(24), []);
  const defaultMonth = getBahrainYearMonth();
  const [month, setMonth] = useState(defaultMonth);
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState<ActiveModal>(null);
  const [step, setStep] = useState<StepState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const titleId = useId();

  const selected = monthOptions.find((o) => o.value === month);
  const summaryLabel = selected?.label ?? monthLabel(month);
  const dayCount = selected?.dayCount ?? 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!active) {
      setStep("idle");
      setErrorMsg(null);
    }
  }, [active]);

  const showSummary = step === "idle" || step === "error" || step === "done";
  const busy = step === "prepare" || step === "fetch" || step === "finish";

  const close = useCallback(() => {
    if (busy) return;
    setActive(null);
  }, [busy]);

  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) setActive(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, busy]);

  const query = `month=${encodeURIComponent(month)}`;

  async function runDownload() {
    setErrorMsg(null);
    setStep("prepare");
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    setStep("fetch");
    let res: Response;
    try {
      res = await fetch(`/api/cod-list/download?${query}`);
    } catch {
      setStep("error");
      setErrorMsg("Network error");
      return;
    }
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setStep("error");
      setErrorMsg(j.error ?? `Request failed (${res.status})`);
      return;
    }
    setStep("finish");
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition");
    const m = /filename="([^"]+)"/.exec(cd ?? "");
    const fn = m?.[1] ?? "COD_Seissense.xlsx";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fn;
    a.click();
    URL.revokeObjectURL(a.href);
    setStep("done");
  }

  async function runEmail() {
    setErrorMsg(null);
    setStep("prepare");
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    setStep("fetch");
    let res: Response;
    try {
      res = await fetch(`/api/cod-list/email?${query}`, { method: "POST" });
    } catch {
      setStep("error");
      setErrorMsg("Network error");
      return;
    }
    let data: { ok?: boolean; error?: string };
    try {
      data = (await res.json()) as { ok?: boolean; error?: string };
    } catch {
      setStep("error");
      setErrorMsg("Invalid response");
      return;
    }
    if (!res.ok || !data.ok) {
      setStep("error");
      setErrorMsg(data.error ?? `Send failed (${res.status})`);
      return;
    }
    setStep("finish");
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    setStep("done");
  }

  const modal = active && mounted && (
    <div
      className="fixed inset-0 flex items-end justify-center p-4 sm:items-center"
      style={{ zIndex: MODAL_Z }}
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-[1px]"
        aria-label="Close"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-card border border-[#EBEBEB] bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.18)]"
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <h2 id={titleId} className="text-base font-semibold text-[#111111]">
            {active === "download" ? "Download monthly Excel" : "Email monthly COD list"}
          </h2>
          <button
            type="button"
            disabled={busy}
            onClick={close}
            className="focus-ring -m-1 rounded-md p-1 text-[#999999] transition hover:bg-[#F7F7F7] hover:text-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {showSummary ? (
          <>
            <p className="text-[12px] text-[#555555]">
              {active === "email"
                ? "Send all COD orders for every collection day in the selected month. Recipients are in COD Settings."
                : "Excel includes all COD orders for each collection day in the month (Bahrain 14:00 windows)."}
            </p>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-[#999999]">Month</p>
            <p className="mt-1 text-[13px] font-medium text-[#111111]">
              {summaryLabel} · {dayCount} collection day{dayCount === 1 ? "" : "s"}
            </p>
            {step === "error" && errorMsg ? (
              <p className="mt-3 text-[12px] font-medium text-[#B45353]" role="alert">
                {errorMsg}
              </p>
            ) : null}
            {step === "done" ? (
              <p className="mt-3 text-[12px] font-medium text-[#1E3A5F]">
                {active === "download" ? "File saved." : "Email sent."}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="focus-ring rounded-lg border border-[#EBEBEB] bg-white px-3 py-1.5 text-[12px] font-medium text-[#555555] transition hover:bg-[#F7F7F7]"
              >
                {step === "done" || step === "error" ? "Close" : "Cancel"}
              </button>
              {step !== "done" ? (
                <button
                  type="button"
                  onClick={() => {
                    if (active === "download") void runDownload();
                    else void runEmail();
                  }}
                  className="focus-ring rounded-lg border border-[#111111] bg-[#111111] px-3 py-1.5 text-[12px] font-medium text-white transition hover:opacity-90"
                >
                  {active === "email" ? "Confirm and send" : "Confirm and download"}
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-[12px] text-[#999999]">Large months may take a minute.</p>
            <StepRow label="Preparing" state={progressRowState(step, 0)} />
            <StepRow
              label={active === "email" ? "Sending to server" : "Loading data and building file"}
              state={progressRowState(step, 1)}
            />
            <StepRow
              label={active === "email" ? "Done" : "Save to your device"}
              state={progressRowState(step, 2)}
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <section className="rounded-card border border-[#EBEBEB] border-l-4 border-l-blue-500 bg-white/95 p-5 shadow-soft backdrop-blur-[2px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
              Monthly export
            </p>
            <h2 className="mt-1 flex items-center gap-2 text-[16px] font-semibold text-[#111111]">
              <CalendarRange size={18} className="shrink-0 text-blue-700" />
              Full month COD list
            </h2>
            <p className="mt-1 text-[12px] text-[#555555]">
              {summaryLabel} · {dayCount} collection day{dayCount === 1 ? "" : "s"} · does not change
              the table above
            </p>
            <p className="mt-1 text-[11px] text-[#999999]">
              Uses the same Bahrain 14:00 windows as daily selection. May take longer for a full month.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[200px]">
            <label htmlFor="cod-month-select" className="text-[11px] font-semibold uppercase tracking-wider text-[#999999]">
              Month
            </label>
            <select
              id="cod-month-select"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="focus-ring w-full rounded-lg border border-[#EBEBEB] bg-white px-3 py-2 text-[13px] font-medium text-[#111111]"
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
            onClick={() => {
              setStep("idle");
              setErrorMsg(null);
              setActive("download");
            }}
            className="focus-ring inline-flex items-center gap-2 rounded-card border border-blue-600 bg-blue-600 px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90"
          >
            <Download size={15} />
            Download Excel
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("idle");
              setErrorMsg(null);
              setActive("email");
            }}
            className="focus-ring inline-flex items-center gap-2 rounded-card border border-[#EBEBEB] bg-white px-4 py-2 text-[13px] font-medium text-[#111111] transition hover:bg-[#F7F7F7]"
          >
            <Mail size={15} className="text-[#555555]" />
            Email Ubex
          </button>
        </div>
      </section>
      {mounted && active ? createPortal(modal, document.body) : null}
    </>
  );
}

function StepRow({ label, state }: { label: string; state: "wait" | "active" | "done" }) {
  return (
    <div className="flex items-center gap-2.5 text-[12px]">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        {state === "done" ? (
          <Check className="text-[#1E3A5F]" size={16} strokeWidth={2.2} />
        ) : state === "active" ? (
          <Loader2 className="animate-spin-slow text-[#1E3A5F]" size={16} />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4D4D4]" />
        )}
      </span>
      <span className={state === "wait" ? "text-[#999999]" : "text-[#111111]"}>{label}</span>
    </div>
  );
}
