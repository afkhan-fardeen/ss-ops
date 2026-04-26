"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Download, Loader2, Mail, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { CodDateOption } from "./CodDatePicker";

const MODAL_Z = 280;

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

export function CodListFloatingActions({ dateOptions }: { dateOptions: CodDateOption[] }) {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState<ActiveModal>(null);
  const [step, setStep] = useState<StepState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!active) {
      setStep("idle");
      setErrorMsg(null);
    }
  }, [active]);

  const lines = selectionLines(searchParams, dateOptions);
  const q = buildListQueryString(searchParams);

  const showSummary = step === "idle" || step === "error" || step === "done";
  const busy = step === "prepare" || step === "fetch" || step === "finish";

  const close = useCallback(() => {
    if (busy) return;
    setActive(null);
  }, [busy]);

  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) {
        setActive(null);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, busy]);

  async function runDownload() {
    setErrorMsg(null);
    setStep("prepare");
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    setStep("fetch");
    const url = q ? `/api/cod-list/download?${q}` : "/api/cod-list/download";
    let res: Response;
    try {
      res = await fetch(url);
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
    const url = q ? `/api/cod-list/email?${q}` : "/api/cod-list/email";
    let res: Response;
    try {
      res = await fetch(url, { method: "POST" });
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
            {active === "download" ? "Download Excel" : "Email to Ubex"}
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
                ? "Send the COD list for the same dates as this page. Recipients are set in Cod settings."
                : "Download matches the same COD selection as the table below."}
            </p>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-[#999999]">Selected dates</p>
            <ul className="mt-1.5 list-inside list-disc text-[12px] text-[#111111]">
              {lines.map((line, i) => (
                <li key={`${i}-${line}`} className="[text-wrap:balance]">
                  {line}
                </li>
              ))}
            </ul>
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
      <div className="pointer-events-auto fixed bottom-4 right-4 z-40 sm:bottom-5 sm:right-5">
        <div className="flex flex-col divide-y divide-[#EBEBEB] overflow-hidden rounded-card border border-[#EBEBEB] bg-white/95 shadow-[0_8px_30px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
          <button
            type="button"
            onClick={() => {
              setStep("idle");
              setErrorMsg(null);
              setActive("download");
            }}
            className="focus-ring flex w-full min-w-0 items-center gap-2 px-3.5 py-2.5 text-left text-[12px] font-medium text-[#111111] transition hover:bg-[#F7F7F7] sm:min-w-[10.5rem] sm:px-4"
          >
            <Download size={16} strokeWidth={2} className="shrink-0 text-[#555555]" />
            <span>Download Excel</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("idle");
              setErrorMsg(null);
              setActive("email");
            }}
            className="focus-ring flex w-full min-w-0 items-center gap-2 px-3.5 py-2.5 text-left text-[12px] font-medium text-[#111111] transition hover:bg-[#F7F7F7] sm:min-w-[10.5rem] sm:px-4"
          >
            <Mail size={16} strokeWidth={2} className="shrink-0 text-[#555555]" />
            <span>Email Ubex</span>
          </button>
        </div>
      </div>
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
      <span className={state === "wait" ? "text-[#999999]" : "text-[#111111]"}>
        {label}
      </span>
    </div>
  );
}
