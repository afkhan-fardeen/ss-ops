"use client";

import { AlertCircle, Bot, Check, ChevronDown, ChevronRight, Copy, ExternalLink, Inbox, User } from "lucide-react";
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
      className="focus-ring inline-flex h-6 w-6 items-center justify-center rounded text-[#999999] transition hover:bg-[#F7F7F7] hover:text-[#111111]"
      title={copied ? "Copied" : "Copy"}
      aria-label="Copy"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

export function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"all" | "success" | "error" | "cron" | "manual">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "cron") return rows.filter((r) => r.userEmail === null && r.status === "success");
    if (filter === "manual") return rows.filter((r) => r.userEmail !== null && r.status === "success");
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-[#EBEBEB] bg-white py-16 text-center">
        <Inbox size={28} className="text-[#999999]" />
        <h3 className="text-sm font-semibold text-[#111111]">No fulfillments yet</h3>
        <p className="max-w-sm text-[13px] text-[#555555]">
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
          { key: "all",     label: "All",         count: rows.length },
          { key: "manual",  label: "Manual",       count: rows.filter((r) => r.userEmail !== null && r.status === "success").length },
          { key: "cron",    label: "Auto-Sync",    count: rows.filter((r) => r.userEmail === null && r.status === "success").length },
          { key: "success", label: "Success",      count: rows.filter((r) => r.status === "success").length },
          { key: "error",   label: "Errors",       count: rows.filter((r) => r.status === "error").length },
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
                  ? "border-[#111111] bg-[#F7F7F7] text-[#111111]"
                  : "border-[#EBEBEB] bg-white text-[#555555] hover:bg-[#F7F7F7]",
              ].join(" ")}
            >
              <span>{f.label}</span>
              <span
                className={[
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  active ? "bg-white text-[#111111]" : "bg-[#F7F7F7] text-[#999999]",
                ].join(" ")}
              >
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-card border border-[#EBEBEB] bg-white shadow-soft">
        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full min-w-[700px] divide-y divide-[#EBEBEB] text-[13px]">
            <thead className="sticky top-0 z-10 bg-[#F7F7F7]">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-[#999999]">
                <th className="px-4 py-2.5">When</th>
                <th className="px-4 py-2.5">Order</th>
                <th className="px-4 py-2.5">Tracking</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">User</th>
                <th className="px-4 py-2.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBEBEB]">
              {filtered.map((row) => {
                const when = formatWhen(row.createdAt);
                const isExpanded = expanded[row.id];
                return (
                  <Fragment key={row.id}>
                    <tr className="align-top">
                      <td className="px-4 py-3 text-[12px]">
                        <div className="font-medium text-[#111111]">{when.rel}</div>
                        <div className="font-mono text-[11px] text-[#999999]">{when.abs}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-[12.5px] font-medium text-[#111111]">
                          {row.orderName}
                        </div>
                        {row.fulfillmentId ? (
                          <div className="mt-0.5 font-mono text-[10.5px] text-[#999999]">
                            FID {row.fulfillmentId}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {row.tracking ? (
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-[12px] text-[#111111]">{row.tracking}</span>
                            <CopyButton value={row.tracking} />
                            {row.trackingUrl ? (
                              <a
                                href={row.trackingUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="focus-ring inline-flex h-6 w-6 items-center justify-center rounded text-[#999999] transition hover:bg-[#F7F7F7] hover:text-[#111111]"
                                title="Open tracking"
                                aria-label="Open tracking"
                              >
                                <ExternalLink size={12} />
                              </a>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-[#999999]">—</span>
                        )}
                        {row.trackingCompany ? (
                          <div className="mt-0.5 text-[11px] text-[#999999]">{row.trackingCompany}</div>
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
                      <td className="px-4 py-3 text-[12px] text-[#555555]">
                        {row.userEmail ? (
                          <span className="inline-flex items-center gap-1">
                            <User size={11} className="text-[#999999]" />
                            {row.userEmail}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#F7F7F7] px-2 py-0.5 text-[11px] font-medium text-[#111111]">
                            <Bot size={11} />
                            Auto-Sync
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.error ? (
                          <button
                            type="button"
                            onClick={() => setExpanded((s) => ({ ...s, [row.id]: !s[row.id] }))}
                            className="focus-ring inline-flex items-center gap-1 rounded-card px-2 py-1 text-[11.5px] font-medium text-[#555555] transition hover:bg-[#F7F7F7] hover:text-[#111111]"
                          >
                            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            {isExpanded ? "Hide" : "Show"}
                          </button>
                        ) : (
                          <span className="text-[11.5px] text-[#999999]">—</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && row.error ? (
                      <tr className="bg-[rgba(194,81,81,0.05)]">
                        <td colSpan={6} className="px-4 py-3">
                          <pre className="whitespace-pre-wrap break-words font-mono text-[11.5px] leading-relaxed text-[#C25151]">
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

