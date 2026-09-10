"use client";

import { useCallback, useEffect, useState } from "react";

type CodExportKind = "download" | "email";
export type CodExportStep = "idle" | "prepare" | "fetch" | "finish" | "done" | "error";

export type CodExportFlow = {
  active: CodExportKind | null;
  step: CodExportStep;
  errorMsg: string | null;
  mounted: boolean;
  busy: boolean;
  showSummary: boolean;
  open: (kind: CodExportKind) => void;
  close: () => void;
  confirm: () => void;
};

/**
 * Shared download/email flow for COD exports — modal open/close state, the
 * prepare→fetch→finish progress steps, and the download-blob / POST-email network
 * calls. `buildQuery` supplies the caller's date-window or month selection as a
 * query string; both /api/cod-list/download and /api/cod-list/email accept it.
 */
export function useCodExportFlow(buildQuery: () => string): CodExportFlow {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState<CodExportKind | null>(null);
  const [step, setStep] = useState<CodExportStep>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!active) {
      setStep("idle");
      setErrorMsg(null);
    }
  }, [active]);

  const busy = step === "prepare" || step === "fetch" || step === "finish";
  const showSummary = step === "idle" || step === "error" || step === "done";

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

  const open = useCallback((kind: CodExportKind) => {
    setStep("idle");
    setErrorMsg(null);
    setActive(kind);
  }, []);

  const runDownload = useCallback(async () => {
    setErrorMsg(null);
    setStep("prepare");
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    setStep("fetch");
    const query = buildQuery();
    const url = query ? `/api/cod-list/download?${query}` : "/api/cod-list/download";
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
  }, [buildQuery]);

  const runEmail = useCallback(async () => {
    setErrorMsg(null);
    setStep("prepare");
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    setStep("fetch");
    const query = buildQuery();
    const url = query ? `/api/cod-list/email?${query}` : "/api/cod-list/email";
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
  }, [buildQuery]);

  const confirm = useCallback(() => {
    if (active === "download") void runDownload();
    else if (active === "email") void runEmail();
  }, [active, runDownload, runEmail]);

  return { active, step, errorMsg, mounted, busy, showSummary, open, close, confirm };
}
