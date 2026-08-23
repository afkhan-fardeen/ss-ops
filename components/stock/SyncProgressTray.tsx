"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, Loader2, X } from "lucide-react";
import { useRestockQueue } from "@/hooks/useRestockQueue";

const AUTO_DISMISS_MS = 4000;

function RowIcon({ status }: { status: "idle" | "busy" | "success" | "error" }) {
  if (status === "busy") {
    return <Loader2 size={14} className="shrink-0 animate-spin-slow text-muted" />;
  }
  if (status === "success") {
    return <Check size={14} className="shrink-0 text-[#4CAF50]" />;
  }
  if (status === "error") {
    return <AlertCircle size={14} className="shrink-0 text-[#C25151]" />;
  }
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-muted"
      aria-hidden
    />
  );
}

export function SyncProgressTray() {
  const { state, running } = useRestockQueue();
  const [dismissed, setDismissed] = useState(false);

  const rows = useMemo(
    () =>
      Object.entries(state)
        .filter(([, s]) => s.status !== "idle")
        .map(([ubexId, s]) => ({ ubexId, ...s })),
    [state],
  );

  const total = rows.length;
  const done = rows.filter((r) => r.status === "success" || r.status === "error").length;

  useEffect(() => {
    if (running) setDismissed(false);
  }, [running]);

  useEffect(() => {
    if (dismissed || running || total === 0 || done < total) return;
    const t = window.setTimeout(() => setDismissed(true), AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [dismissed, running, total, done]);

  const visible = total > 0 && !dismissed;

  return (
    <div
      className={[
        "fixed bottom-4 right-4 z-40 w-[min(100%-2rem,20rem)] transition-all duration-200",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0",
      ].join(" ")}
      aria-hidden={!visible}
    >
      {visible ? (
        <div className="rounded-card border border-line bg-white shadow-soft">
          <div className="flex items-start justify-between gap-2 border-b border-line px-3 py-2.5">
            <p className="text-[13px] font-medium text-ink">
              {running
                ? `Syncing ${total} product${total === 1 ? "" : "s"}`
                : `Synced ${total} product${total === 1 ? "" : "s"}`}
            </p>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="rounded-card p-1 text-muted hover:bg-canvas hover:text-ink"
              aria-label="Dismiss sync progress"
            >
              <X size={14} />
            </button>
          </div>
          <ul className="max-h-64 space-y-1 overflow-y-auto px-3 py-2">
            {rows.map((row) => {
              const body = (
                <>
                  <RowIcon status={row.status} />
                  <span className="min-w-0 truncate text-[12px] text-ink">
                    {row.productName || row.ubexId}
                  </span>
                </>
              );
              return (
                <li key={row.ubexId}>
                  {row.status === "error" ? (
                    <Link
                      href="/stock-balance/errors"
                      className="flex items-center gap-2 rounded-md py-1 hover:bg-canvas"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2 py-1">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="border-t border-line px-3 py-2 font-mono text-[11px] tabular-nums text-muted">
            {done} of {total} done
          </p>
        </div>
      ) : null}
    </div>
  );
}
