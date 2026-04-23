"use client";

import { AlertCircle, Check, ChevronDown, ChevronRight, Copy, ExternalLink, Inbox } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { StatusPill } from "@/components/portal/StatusPill";

export type HistoryRow = {
  id: string;
  createdAt: string;
  orderId: number;
  orderName: string;
  tracking: string | null;
  trackingUrl: string | null;
  trackingCompany: string | null;
  status: "success" | "error";
  error: string | null;
  fulfillmentId: number | null;
  userEmail: string | null;
};

function formatWhen(iso: string): { abs: string; rel: string } {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.round(diff / 60_000);
  let rel = "just now";
  if (mins >= 60 * 24) rel = `${Math.round(mins / (60 * 24))}d ago`;
  else if (mins >= 60) rel = `${Math.round(mins / 60)}h ago`;
  else if (mins >= 1) rel = `${mins}m ago`;
  return {
    abs: d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }),
    rel,
  };
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  function copy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(value).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      },
      () => {},
    );
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="focus-ring inline-flex h-6 w-6 items-center justify-center rounded text-portal-text3 transition hover:bg-portal-bg3 hover:text-portal-text"
      title={copied ? "Copied" : "Copy"}
      aria-label="Copy"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

export function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"all" | "success" | "error">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-portal-border bg-portal-bg2 py-16 text-center">
        <Inbox size={28} className="text-portal-text3" />
        <h3 className="text-sm font-semibold text-portal-text">No fulfillments yet</h3>
        <p className="max-w-sm text-[13px] text-portal-text2">
          Pushes from COD or Fulfillment will appear here with tracking, status, and the signed-in
          user who triggered them.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="History filter">
        {([
          { key: "all", label: "All", count: rows.length },
          { key: "success", label: "Success", count: rows.filter((r) => r.status === "success").length },
          { key: "error", label: "Error", count: rows.filter((r) => r.status === "error").length },
        ] as const).map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.key)}
              className={[
                "focus-ring inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition",
                active
                  ? "border-portal-accent bg-portal-accentSoft text-portal-accent"
                  : "border-portal-border bg-portal-bg2 text-portal-text2 hover:bg-portal-bg3",
              ].join(" ")}
            >
              <span>{f.label}</span>
              <span
                className={[
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  active ? "bg-portal-bg2 text-portal-accent" : "bg-portal-bg3 text-portal-text3",
                ].join(" ")}
              >
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-card border border-portal-border bg-portal-bg2 shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-portal-border text-[13px]">
            <thead className="bg-portal-bg3/60">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-portal-text3">
                <th className="px-4 py-2.5">When</th>
                <th className="px-4 py-2.5">Order</th>
                <th className="px-4 py-2.5">Tracking</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">User</th>
                <th className="px-4 py-2.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-portal-border">
              {filtered.map((row) => {
                const when = formatWhen(row.createdAt);
                const isExpanded = expanded[row.id];
                return (
                  <Fragment key={row.id}>
                    <tr className="align-top">
                      <td className="px-4 py-3 text-[12px]">
                        <div className="font-medium text-portal-text">{when.rel}</div>
                        <div className="font-mono text-[11px] text-portal-text3">{when.abs}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-[12.5px] font-medium text-portal-text">
                          {row.orderName}
                        </div>
                        {row.fulfillmentId ? (
                          <div className="mt-0.5 font-mono text-[10.5px] text-portal-text3">
                            FID {row.fulfillmentId}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {row.tracking ? (
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-[12px] text-portal-text">{row.tracking}</span>
                            <CopyButton value={row.tracking} />
                            {row.trackingUrl ? (
                              <a
                                href={row.trackingUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="focus-ring inline-flex h-6 w-6 items-center justify-center rounded text-portal-text3 transition hover:bg-portal-bg3 hover:text-portal-accent"
                                title="Open tracking"
                                aria-label="Open tracking"
                              >
                                <ExternalLink size={12} />
                              </a>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-portal-text3">—</span>
                        )}
                        {row.trackingCompany ? (
                          <div className="mt-0.5 text-[11px] text-portal-text3">{row.trackingCompany}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill
                          tone={row.status === "success" ? "green" : "red"}
                          icon={row.status === "error" ? <AlertCircle size={11} /> : undefined}
                        >
                          {row.status === "success" ? "Success" : "Error"}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-portal-text2">
                        {row.userEmail ?? <span className="text-portal-text3">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.error ? (
                          <button
                            type="button"
                            onClick={() => setExpanded((s) => ({ ...s, [row.id]: !s[row.id] }))}
                            className="focus-ring inline-flex items-center gap-1 rounded-card px-2 py-1 text-[11.5px] font-medium text-portal-text2 transition hover:bg-portal-bg3 hover:text-portal-text"
                          >
                            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            {isExpanded ? "Hide" : "Show"}
                          </button>
                        ) : (
                          <span className="text-portal-text3 text-[11.5px]">—</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && row.error ? (
                      <tr className="bg-portal-redSoft/30">
                        <td colSpan={6} className="px-4 py-3">
                          <pre className="whitespace-pre-wrap break-words font-mono text-[11.5px] leading-relaxed text-portal-red">
                            {row.error}
                          </pre>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
