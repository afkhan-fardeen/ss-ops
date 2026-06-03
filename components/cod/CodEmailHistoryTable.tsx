"use client";

import { StatusPill } from "@/components/portal/StatusPill";

export type CodEmailLogRow = {
  id: string;
  sentAt: string;
  sentByEmail: string | null;
  windowStart: string;
  windowEnd: string;
  recipients: string;
  orderCount: number;
  status: "success" | "error";
  error: string | null;
};

function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function CodEmailHistoryTable({ rows }: { rows: CodEmailLogRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-card border border-[#EBEBEB] bg-white px-4 py-8 text-center text-[13px] text-[#999999] shadow-soft">
        No COD emails sent yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-[#EBEBEB] bg-white shadow-soft">
      <table className="w-full min-w-[640px] border-collapse text-left text-[12.5px]">
        <thead>
          <tr className="border-b border-[#EBEBEB] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wide text-[#999999]">
            <th className="px-3 py-2.5">Sent</th>
            <th className="px-3 py-2.5">Window</th>
            <th className="px-3 py-2.5 text-right">Orders</th>
            <th className="px-3 py-2.5">Recipients</th>
            <th className="px-3 py-2.5">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-[#F0F0F0] last:border-0 hover:bg-[#FAFAFA]">
              <td className="whitespace-nowrap px-3 py-2.5 text-[#555555]">
                <div>{fmtWhen(row.sentAt)}</div>
                {row.sentByEmail ? (
                  <div className="text-[11px] text-[#999999]">{row.sentByEmail}</div>
                ) : null}
              </td>
              <td className="px-3 py-2.5 text-[12px] text-[#555555]">
                {fmtWhen(row.windowStart)} → {fmtWhen(row.windowEnd)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">{row.orderCount}</td>
              <td className="max-w-[200px] truncate px-3 py-2.5 text-[12px]" title={row.recipients}>
                {row.recipients}
              </td>
              <td className="px-3 py-2.5">
                <StatusPill tone={row.status === "success" ? "green" : "red"}>{row.status}</StatusPill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
