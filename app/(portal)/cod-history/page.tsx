import Link from "next/link";
import { CalendarDays, Mail, CheckCircle, XCircle, Clock, ListChecks } from "lucide-react";
import { getLastNWindows } from "@/lib/datetime/collection-window";
import { getSupabaseService } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type EmailLogEntry = {
  id: string;
  sent_at: string;
  sent_by_email: string | null;
  window_start: string;
  window_end: string;
  recipients: string;
  order_count: number;
  status: "success" | "error";
  error: string | null;
};

async function loadEmailLog(): Promise<EmailLogEntry[]> {
  const supabase = getSupabaseService();
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from("cod_email_log")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(200);
    return (data ?? []) as EmailLogEntry[];
  } catch {
    return [];
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bahrain",
  });
}

function rel(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function CodHistoryPage() {
  const [windows, emailLog] = await Promise.all([
    Promise.resolve(getLastNWindows(14)),
    loadEmailLog(),
  ]);

  // Build a quick lookup: dateKey → emails sent
  const emailsByWindow: Record<string, EmailLogEntry[]> = {};
  for (const e of emailLog) {
    // Match email to window by overlap
    const wKey = new Date(e.window_end).toLocaleDateString("en-CA", { timeZone: "Asia/Bahrain" });
    if (!emailsByWindow[wKey]) emailsByWindow[wKey] = [];
    emailsByWindow[wKey].push(e);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* ── Collection Windows ─────────────────────────── */}
      <section>
        <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-[#999999]">
          Collection Windows · Last 14 Days
        </h2>
        <div className="space-y-2">
          {windows.map((w) => {
            const emails = emailsByWindow[w.dateKey] ?? [];
            const successEmails = emails.filter((e) => e.status === "success");
            return (
              <div
                key={w.dateKey}
                className="flex items-center gap-4 rounded-card border border-[#EBEBEB] bg-white px-5 py-4 shadow-soft"
              >
                {/* Date */}
                <div className="flex w-44 shrink-0 items-center gap-2.5">
                  <CalendarDays size={15} className="text-[#999999]" />
                  <div>
                    <p className="text-[13px] font-semibold text-[#111111]">{w.label}</p>
                    <p className="font-mono text-[11px] text-[#999999]">{w.dateKey}</p>
                  </div>
                </div>

                {/* Email count */}
                <div className="flex items-center gap-1.5">
                  <Mail size={13} className="text-[#999999]" />
                  {successEmails.length > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(76,175,80,0.10)] px-2 py-0.5 text-[11px] font-medium text-[#4CAF50]">
                      <CheckCircle size={10} />
                      {successEmails.length} sent
                    </span>
                  ) : (
                    <span className="text-[12px] text-[#999999]">No emails</span>
                  )}
                </div>

                <div className="ml-auto flex gap-2">
                  <Link
                    href={`/cod-list?date=${w.dateKey}`}
                    className="focus-ring inline-flex items-center gap-1.5 rounded-card border border-[#EBEBEB] bg-white px-3 py-1.5 text-[12px] font-medium text-[#111111] transition hover:bg-[#F7F7F7]"
                  >
                    <ListChecks size={13} />
                    View List
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Email Log ──────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-[#999999]">
          Email Send History
        </h2>

        {emailLog.length === 0 ? (
          <div className="rounded-card border border-dashed border-[#EBEBEB] bg-white p-10 text-center">
            <Mail size={28} className="mx-auto text-[#999999]" />
            <p className="mt-3 text-sm font-medium text-[#111111]">No emails sent yet</p>
            <p className="mt-1 text-[13px] text-[#555555]">
              Use the &ldquo;Email Ubex&rdquo; button on the COD List page to send the daily list.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-card border border-[#EBEBEB] bg-white shadow-soft">
            <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#EBEBEB] bg-[#F7F7F7] text-[10px] font-semibold uppercase tracking-wider text-[#999999]">
                  <th className="px-4 py-3">Sent</th>
                  <th className="px-4 py-3">Window</th>
                  <th className="px-4 py-3">By</th>
                  <th className="px-4 py-3">Recipients</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {emailLog.map((e) => (
                  <tr key={e.id} className="border-b border-[#EBEBEB] last:border-0 hover:bg-[#F7F7F7]">
                    <td className="px-4 py-3">
                      <div className="text-[12px] font-medium text-[#111111]">{rel(e.sent_at)}</div>
                      <div className="font-mono text-[11px] text-[#999999]">{formatTime(e.sent_at)}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[#555555]">
                      {new Date(e.window_end).toLocaleDateString("en-GB", {
                        day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Bahrain",
                      })}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#555555]">
                      {e.sent_by_email ?? (
                        <span className="rounded-full bg-[#F7F7F7] px-2 py-0.5 text-[11px] font-medium text-[#111111]">
                          System
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#555555]">
                      {e.recipients || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px]">{e.order_count}</td>
                    <td className="px-4 py-3">
                      {e.status === "success" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(76,175,80,0.10)] px-2.5 py-0.5 text-[11px] font-medium text-[#4CAF50]">
                          <CheckCircle size={10} />
                          Sent
                        </span>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(194,81,81,0.10)] px-2.5 py-0.5 text-[11px] font-medium text-[#C25151]">
                            <XCircle size={10} />
                            Failed
                          </span>
                          {e.error && (
                            <p className="mt-1 max-w-[200px] truncate text-[11px] text-[#999999]" title={e.error}>
                              {e.error}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
