import nodemailer from "nodemailer";
import { workbookToBuffer, buildCodWorkbook, codFilenameFromDate } from "@/lib/excel";
import type { CodRow } from "@/lib/cod/build-rows";

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export async function sendCodListEmail(params: {
  rows: CodRow[];
  orderCount: number;
  totalGbp: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const transporter = getTransporter();
  if (!transporter) return { ok: false, error: "GMAIL_USER or GMAIL_APP_PASSWORD is not set" };

  const to = process.env.UBEX_EMAIL;
  if (!to) return { ok: false, error: "UBEX_EMAIL is not set" };

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
