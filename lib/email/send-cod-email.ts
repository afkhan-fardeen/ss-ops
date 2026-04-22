import { Resend } from "resend";
import { workbookToBuffer, buildCodWorkbook, codFilenameFromDate } from "@/lib/excel";
import type { CodRow } from "@/lib/cod/build-rows";

export async function sendCodListEmail(params: {
  rows: CodRow[];
  orderCount: number;
  totalGbp: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.UBEX_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL ?? "Seissense Ops <onboarding@resend.dev>";
  if (!key) return { ok: false, error: "RESEND_API_KEY is not set" };
  if (!to) return { ok: false, error: "UBEX_EMAIL is not set" };

  const resend = new Resend(key);
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

  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    text: body,
    attachments: [{ filename, content: buffer }],
  });

  if (error) {
    return { ok: false, error: error.message ?? "Resend error" };
  }
  return { ok: true };
}
