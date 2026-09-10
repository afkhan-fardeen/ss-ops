"use client";

import { useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, X } from "lucide-react";
import type { CodExportFlow, CodExportStep } from "@/lib/cod/use-cod-export-flow";

const MODAL_Z = 280;

function progressRowState(s: CodExportStep, index: 0 | 1 | 2): "wait" | "active" | "done" {
  if (s === "done" || s === "error" || s === "idle") return "wait";
  const i = s === "prepare" ? 0 : s === "fetch" ? 1 : 2;
  if (index < i) return "done";
  if (index === i) return "active";
  return "wait";
}

function StepRow({ label, state }: { label: string; state: "wait" | "active" | "done" }) {
  return (
    <div className="flex items-center gap-2.5 text-[12px]">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        {state === "done" ? (
          <Check className="text-cod" size={16} strokeWidth={2.2} />
        ) : state === "active" ? (
          <Loader2 className="animate-spin-slow text-cod" size={16} />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-line" />
        )}
      </span>
      <span className={state === "wait" ? "text-muted" : "text-ink"}>{label}</span>
    </div>
  );
}

/** Shared download/email modal shell for both the day-window and month-range COD export flows. */
export function CodExportModal({
  flow,
  title,
  description,
  summary,
  confirmLabel,
  extraProgressNote,
}: {
  flow: CodExportFlow;
  title: string;
  description: string;
  summary: ReactNode;
  confirmLabel: string;
  extraProgressNote?: string;
}) {
  const titleId = useId();
  const { active, mounted, step, errorMsg, showSummary, busy, close, confirm } = flow;

  if (!active || !mounted) return null;

  const modal = (
    <div
      className="fixed inset-0 flex items-end justify-center p-4 sm:items-center"
      style={{ zIndex: MODAL_Z }}
    >
      <button
        type="button"
        className="absolute inset-0 bg-ink/40 backdrop-blur-[1px]"
        aria-label="Close"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-card border border-line bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.18)]"
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <h2 id={titleId} className="text-base font-medium text-ink">
            {title}
          </h2>
          <button
            type="button"
            disabled={busy}
            onClick={close}
            className="focus-ring -m-1 rounded-md p-1 text-muted transition hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {showSummary ? (
          <>
            <p className="text-[12px] text-muted">{description}</p>
            {summary}
            {step === "error" && errorMsg ? (
              <p className="mt-3 text-[12px] font-medium text-[#B45353]" role="alert">
                {errorMsg}
              </p>
            ) : null}
            {step === "done" ? (
              <p className="mt-3 text-[12px] font-medium text-cod">
                {active === "download" ? "File saved." : "Email sent."}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="focus-ring rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-muted transition hover:bg-canvas"
              >
                {step === "done" || step === "error" ? "Close" : "Cancel"}
              </button>
              {step !== "done" ? (
                <button
                  type="button"
                  onClick={confirm}
                  className="focus-ring rounded-lg border border-ink bg-ink px-3 py-1.5 text-[12px] font-medium text-white transition hover:opacity-90"
                >
                  {confirmLabel}
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            {extraProgressNote ? <p className="text-[12px] text-muted">{extraProgressNote}</p> : null}
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

  return createPortal(modal, document.body);
}
