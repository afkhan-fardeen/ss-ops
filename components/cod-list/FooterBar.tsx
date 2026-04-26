"use client";

import { Download, Loader2, Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

function buildListQueryString(searchParams: ReturnType<typeof useSearchParams>): string {
  const d = searchParams.get("dates");
  const o = searchParams.get("date");
  const sp = new URLSearchParams();
  if (d) sp.set("dates", d);
  else if (o) sp.set("date", o);
  return sp.toString();
}

export function FooterBar() {
  const searchParams = useSearchParams();
  const listQuery = buildListQueryString(searchParams);
  const [downloading, setDownloading] = useState(false);
  const [pendingEmail, startEmailTransition] = useTransition();
  const [emailMsg, setEmailMsg] = useState<string | null>(null);

  function download() {
    setDownloading(true);
    const t = toast.loading("Preparing download…");
    const q = listQuery;
    const url = q ? `/api/cod-list/download?${q}` : "/api/cod-list/download";
    void fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          toast.error(j.error ?? "Download failed", { id: t });
          return;
        }
        const blob = await res.blob();
        const cd = res.headers.get("Content-Disposition");
        const m = /filename="([^"]+)"/.exec(cd ?? "");
        const fn = m?.[1] ?? "COD_Seissense.xlsx";
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fn;
        a.click();
        URL.revokeObjectURL(a.href);
        toast.success("File saved", { id: t });
      })
      .catch(() => {
        toast.error("Network error", { id: t });
      })
      .finally(() => setDownloading(false));
  }

  function sendEmail() {
    setEmailMsg(null);
    const q = listQuery;
    const url = q ? `/api/cod-list/email?${q}` : "/api/cod-list/email";
    startEmailTransition(async () => {
      try {
        const resp = await fetch(url, { method: "POST" });
        const data = (await resp.json()) as { ok: boolean; error?: string };
        if (data.ok) {
          setEmailMsg("Email sent");
          toast.success("COD list emailed successfully");
        } else {
          const msg = data.error ?? "Send failed";
          setEmailMsg(msg);
          toast.error(msg);
        }
      } catch {
        setEmailMsg("Network error");
        toast.error("Network error sending email");
      }
    });
  }

  return (
    <div
      className="fixed bottom-16 right-0 z-20 border-t border-[#EBEBEB] bg-white/95 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] md:bottom-0"
      style={{ left: "var(--sb-w, 0px)" }}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <div className="min-w-0 flex-1 text-[12px] text-[#555555] sm:flex sm:items-center sm:pr-4">
          {emailMsg ? (
            <span className="inline-flex rounded-full bg-[#F7F7F7] px-2.5 py-0.5 font-medium text-[#111111]">
              {emailMsg}
            </span>
          ) : (
            <span className="text-[#999999] [text-wrap:balance]">Download the Excel sheet or email it to Ubex.</span>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2" aria-live="polite">
          <button
            type="button"
            onClick={() => void download()}
            disabled={downloading}
            className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-card border border-[#EBEBEB] bg-white px-3 text-[12px] font-medium text-[#111111] transition hover:bg-[#F7F7F7] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloading ? <Loader2 size={14} className="animate-spin-slow" /> : <Download size={14} strokeWidth={2} />}
            {downloading ? "Downloading…" : "Download Excel"}
          </button>
          <button
            type="button"
            onClick={sendEmail}
            disabled={pendingEmail}
            className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-card border border-[#EBEBEB] bg-white px-3 text-[12px] font-medium text-[#111111] transition hover:bg-[#F7F7F7] disabled:opacity-60"
          >
            {pendingEmail ? <Loader2 size={14} className="animate-spin-slow" /> : <Mail size={14} />}
            {pendingEmail ? "Sending…" : "Email Ubex"}
          </button>
        </div>
      </div>
    </div>
  );
}
