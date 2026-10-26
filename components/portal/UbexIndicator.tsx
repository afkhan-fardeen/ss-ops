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
    ok: "bg-success",
    error: "bg-danger",
    unconfigured: "bg-warning",
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
      aria-label={`${label[status]}. Tap to recheck`}
      className={`focus-ring flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-full transition hover:bg-canvas sm:min-h-0 sm:min-w-0 sm:border sm:border-line sm:px-3 sm:py-1 ${className}`}
    >
      <span className="relative inline-flex h-2.5 w-2.5">
        {status === "ok" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
        )}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dot[status]}`} />
      </span>
      <span className="hidden text-caption font-medium text-muted sm:inline">{label[status]}</span>
    </button>
  );
}
