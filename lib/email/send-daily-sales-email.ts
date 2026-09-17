import nodemailer from "nodemailer";
import { getSupabaseService } from "@/lib/supabase/service";
import type { DailySalesReport } from "@/lib/sales/daily-sales-report";
import { buildSalesReportWorkbook, salesReportFilename } from "@/lib/sales/build-sales-report-workbook";

const RECIPIENTS_KEY = "sales_report_emails";

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (!user || !pass) return null;
  return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}

export async function getSalesReportRecipients(): Promise<string[]> {
  try {
    const supabase = getSupabaseService();
    if (!supabase) return [];
    const { data } = await supabase
      .from("cod_settings")
      .select("value")
      .eq("key", RECIPIENTS_KEY)
      .maybeSingle();
    const raw = (data as { value: string } | null)?.value ?? "";
    return raw.split(",").map((e) => e.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function htmlWrap(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { margin:0; padding:0; background:#F7F7F7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
  .wrapper { max-width:560px; margin:32px auto; background:#fff; border-radius:12px; overflow:hidden; border:1px solid #EBEBEB; }
  .header { padding:28px 32px 20px; border-bottom:1px solid #EBEBEB; }
  .header h1 { margin:0; font-size:18px; font-weight:700; color:#111; }
  .header p  { margin:6px 0 0; font-size:13px; color:#777; }
  .body { padding:24px 32px; }
  .store { margin-bottom:20px; }
  .store:last-child { margin-bottom:0; }
  .store h2 { margin:0 0 10px; font-size:14px; font-weight:600; color:#111; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  td { padding:8px 0; border-bottom:1px solid #F2F2F2; color:#333; }
  td:last-child { text-align:right; font-weight:600; color:#111; }
  tr:last-child td { border-bottom:none; }
  .cta { display:block; margin:0 0 22px; padding:12px 16px; background:#111; color:#fff !important; text-decoration:none; text-align:center; border-radius:8px; font-size:13px; font-weight:600; }
  .footer { padding:16px 32px; border-top:1px solid #EBEBEB; font-size:11px; color:#aaa; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header"><h1>${title}</h1><p>Seissense Ops Bot</p></div>
  <div class="body">${content}</div>
  <div class="footer">Seissense Ops Bot · ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Bahrain" })} (Bahrain)</div>
</div>
</body></html>`;
}

function buildContent(report: DailySalesReport, reportUrl: string): string {
  const stores = report.stores
    .map(
      (s) => `
      <div class="store">
        <h2>${s.store}</h2>
        <table>
          <tr><td>Orders</td><td>${s.orderCount}</td></tr>
          <tr><td>Units sold</td><td>${s.unitsSold}</td></tr>
          <tr><td>Total sales</td><td>${formatMoney(s.totalSales, s.currency)}</td></tr>
          <tr><td>Discounts given</td><td>${formatMoney(s.totalDiscounts, s.currency)}</td></tr>
        </table>
      </div>`,
    )
    .join("");
  return `<a class="cta" href="${reportUrl}">View full report — order list, top products, history</a>${stores}`;
}

export async function sendDailySalesEmail(
  report: DailySalesReport,
  portalBaseUrl: string,
): Promise<{ ok: boolean; sent: boolean; recipients: number; error?: string }> {
  const recipients = await getSalesReportRecipients();
  if (recipients.length === 0) return { ok: true, sent: false, recipients: 0 };

  const transporter = getTransporter();
  if (!transporter) return { ok: false, sent: false, recipients: 0, error: "Email is not configured (GMAIL_USER / GMAIL_APP_PASSWORD)." };

  const subject = `Daily sales report — ${report.day.label}`;
  const reportUrl = `${portalBaseUrl}/sales-report?day=${report.day.dateKey}`;
  try {
    const workbook = await buildSalesReportWorkbook(report);
    const attachmentBuffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
    await transporter.sendMail({
      from: `Seissense Ops <${process.env.GMAIL_USER}>`,
      to: recipients.join(", "),
      subject,
      html: htmlWrap(subject, buildContent(report, reportUrl)),
      attachments: [
        {
          filename: salesReportFilename(report.day.dateKey),
          content: Buffer.from(attachmentBuffer),
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });
    return { ok: true, sent: true, recipients: recipients.length };
  } catch (e) {
    return { ok: false, sent: false, recipients: recipients.length, error: e instanceof Error ? e.message : "Failed to send" };
  }
}
