import nodemailer from "nodemailer";
import { workbookToBuffer, buildCodWorkbook, codFilenameFromDate } from "@/lib/excel";
import type { CodRow } from "@/lib/cod/build-rows";
import { getSupabaseService } from "@/lib/supabase/service";

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

async function getRecipients(): Promise<string[]> {
  // Try Supabase first
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
  } catch {
    /* fall through to env var */
  }
  // Fall back to env var
  const env = process.env.UBEX_EMAIL;
  return env ? [env] : [];
}

export async function sendCodListEmail(params: {
  rows: CodRow[];
  orderCount: number;
  totalGbp: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const transporter = getTransporter();
  if (!transporter) return { ok: false, error: "GMAIL_USER or GMAIL_APP_PASSWORD is not set" };

  const recipients = await getRecipients();
  if (recipients.length === 0) {
    return { ok: false, error: "No recipients configured. Add them in COD Settings or set UBEX_EMAIL." };
  }
  const to = recipients.join(", ");

  const from = `Seissense Ops <${process.env.GMAIL_USER}>`;

  const wb = await buildCodWorkbook(params.rows);
  const buffer = await workbookToBuffer(wb);
  const filename = codFilenameFromDate();
  const dateLine = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const subject = `COD List — Seissense — ${dateLine}`;
  const body = `COD list attached.\n\nOrders: ${params.orderCount}\nTotal (GBP): £${params.totalGbp.toFixed(2)}\n`;

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      text: body,
      attachments: [{ filename, content: buffer }],
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gmail send failed" };
  }
}
