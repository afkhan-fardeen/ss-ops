"use client";

import { useEffect, useRef, useState } from "react";

type UbexStatus = "checking" | "ok" | "error" | "unconfigured";

/** Shared Ubex connectivity pill — used in the shell Topbar and the launcher header. */
export function UbexIndicator({ className = "" }: { className?: string }) {
  const [status, setStatus] = useState<UbexStatus>("checking");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function check() {
    try {
      const res = await fetch("/api/ubex/ping", { cache: "no-store" });
      const data = (await res.json()) as { status: string };
      setStatus(data.status === "ok" ? "ok" : data.status === "unconfigured" ? "unconfigured" : "error");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    void check();
    timerRef.current = setInterval(() => void check(), 5 * 60_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const dot: Record<UbexStatus, string> = {
    checking: "bg-muted animate-pulse",
    ok: "bg-[#4CAF50]",
    error: "bg-[#C25151]",
    unconfigured: "bg-[#F0B743]",
  };
  const label: Record<UbexStatus, string> = {
    checking: "Checking…",
    ok: "Ubex live",
    error: "Ubex error",
    unconfigured: "Ubex not set",
  };

  return (
    <button
      type="button"
      onClick={() => {
        setStatus("checking");
        void check();
      }}
      title={`${label[status]} — click to recheck`}
      className={`focus-ring flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 transition hover:bg-canvas ${className}`}
    >
      <span className="relative inline-flex h-2 w-2">
        {status === "ok" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4CAF50] opacity-60" />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dot[status]}`} />
      </span>
      <span className="hidden text-[11px] font-medium text-muted sm:inline">{label[status]}</span>
    </button>
  );
}
