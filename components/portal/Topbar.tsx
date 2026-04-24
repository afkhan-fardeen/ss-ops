"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const titles: Record<string, string> = {
  "/cod-list":    "COD List",
  "/fulfillment": "Fulfillment",
  "/history":     "History",
  "/account":     "Account",
  "/cod-settings":"COD Settings",
};

const sections: Record<string, string> = {
  "/cod-list":    "Tools",
  "/fulfillment": "Tools",
  "/history":     "Tools",
  "/account":     "Settings",
  "/cod-settings":"Settings",
};

type UbexStatus = "checking" | "ok" | "error" | "unconfigured";

function UbexIndicator() {
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
    // Re-check every 5 minutes
    timerRef.current = setInterval(() => void check(), 5 * 60_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const dot: Record<UbexStatus, string> = {
    checking:     "bg-[#999999] animate-pulse",
    ok:           "bg-[#4CAF50]",
    error:        "bg-[#C25151]",
    unconfigured: "bg-[#F0B743]",
  };
  const label: Record<UbexStatus, string> = {
    checking:     "Checking…",
    ok:           "Ubex live",
    error:        "Ubex error",
    unconfigured: "Ubex not set",
  };

  return (
    <button
      type="button"
      onClick={() => { setStatus("checking"); void check(); }}
      title={`${label[status]} — click to recheck`}
      className="focus-ring flex items-center gap-1.5 rounded-full border border-[#EBEBEB] px-2.5 py-1 transition hover:bg-[#F7F7F7]"
    >
      <span className={`inline-block h-2 w-2 rounded-full ${dot[status]}`} />
      <span className="text-[11px] font-medium text-[#555555]">{label[status]}</span>
    </button>
  );
}

export function Topbar() {
  const pathname = usePathname();
  const title   = titles[pathname]   ?? "Portal";
  const section = sections[pathname] ?? "";
  const today   = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day:     "numeric",
    month:   "short",
  });

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-[#EBEBEB] bg-white px-4 md:px-6">
      <div className="flex items-center gap-2">
        {section && (
          <>
            <span className="text-[12px] font-medium text-[#999999]">{section}</span>
            <span className="text-[#EBEBEB]">/</span>
          </>
        )}
        <h1 className="text-[14px] font-semibold text-[#111111]">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <UbexIndicator />
        <span className="hidden font-mono text-[11px] text-[#999999] sm:inline">{today}</span>
      </div>
    </header>
  );
}
