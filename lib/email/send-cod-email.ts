import nodemailer from "nodemailer";
import { workbookToBuffer, buildCodWorkbook, codFilenameFromDate } from "@/lib/excel";
import type { CodRow } from "@/lib/cod/build-rows";
import { getSupabaseService } from "@/lib/supabase/service";

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (!user || !pass) return null;
  return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}

async function getRecipients(): Promise<string[]> {
  try {
    const supabase = getSupabaseService();
    if (supabase) {
      const { data } = await supabase
        .from("cod_settings")
        .select("value")
        .eq("key", "email_recipients")
        .maybeSingle();
      const raw = (data as { value: string } | null)?.value ?? "";
      const list = raw.split(",").map((e) => e.trim()).filter(Boolean);
      if (list.length > 0) return list;
    }
  } catch { /* fall through */ }
  const env = process.env.UBEX_EMAIL;
  return env ? [env] : [];
}

async function logEmail(params: {
  sentByEmail: string | null;
  windowStart: string;
  windowEnd: string;
  recipients: string[];
  orderCount: number;
  status: "success" | "error";
  error?: string;
}) {
  try {
    const supabase = getSupabaseService();
    if (!supabase) return;
    await supabase.from("cod_email_log").insert({
      sent_by_email: params.sentByEmail,
      window_start: params.windowStart,
      window_end: params.windowEnd,
      recipients: params.recipients.join(", "),
      order_count: params.orderCount,
      status: params.status,
      error: params.error ?? null,
    });
  } catch {
    /* non-critical — don't crash email sends if logging fails */
  }
}

export async function sendCodListEmail(params: {
  rows: CodRow[];
  orderCount: number;
  totalGbp: number;
  windowStart?: string;
  windowEnd?: string;
  sentByEmail?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const transporter = getTransporter();
  if (!transporter) return { ok: false, error: "GMAIL_USER or GMAIL_APP_PASSWORD is not set" };

  const recipients = await getRecipients();
  if (recipients.length === 0) {
    return { ok: false, error: "No recipients configured. Add them in COD Settings or set UBEX_EMAIL." };
  }

  const wb = await buildCodWorkbook(params.rows);
  const buffer = await workbookToBuffer(wb);
  const filename = codFilenameFromDate();
  const dateLine = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const subject = `COD List — Seissense — ${dateLine}`;
  const body = `COD list attached.\n\nOrders: ${params.orderCount}\nTotal (GBP): £${params.totalGbp.toFixed(2)}\n`;

  try {
    await transporter.sendMail({
      from: `Seissense Ops <${process.env.GMAIL_USER}>`,
      to: recipients.join(", "),
      subject,
      text: body,
      attachments: [{ filename, content: buffer }],
    });

    await logEmail({
      sentByEmail: params.sentByEmail ?? null,
      windowStart: params.windowStart ?? new Date(Date.now() - 86400000).toISOString(),
      windowEnd: params.windowEnd ?? new Date().toISOString(),
      recipients,
      orderCount: params.orderCount,
      status: "success",
    });

    return { ok: true };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Gmail send failed";

    await logEmail({
      sentByEmail: params.sentByEmail ?? null,
      windowStart: params.windowStart ?? new Date(Date.now() - 86400000).toISOString(),
      windowEnd: params.windowEnd ?? new Date().toISOString(),
      recipients,
      orderCount: params.orderCount,
      status: "error",
      error: errMsg,
    });

    return { ok: false, error: errMsg };
  }
}
