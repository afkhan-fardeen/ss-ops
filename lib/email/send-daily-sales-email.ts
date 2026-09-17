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
  body { margin:0; padding:0; background:#EEF1F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
  .wrapper { max-width:580px; margin:32px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(17,17,17,0.06); }
  .header { padding:30px 32px; background:linear-gradient(135deg,#1E3A5F 0%,#2E5C8A 100%); }
  .header p.eyebrow { margin:0; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#9FC1E5; }
  .header h1 { margin:6px 0 0; font-size:20px; font-weight:700; color:#fff; }
  .body { padding:28px 32px 8px; }
  .note { margin:0 0 20px; padding:10px 14px; background:#F5F7FA; border-left:3px solid #C9D3E0; border-radius:6px; font-size:12px; color:#667; line-height:1.5; }
  .cta { display:block; margin:0 0 24px; padding:13px 16px; background:#1E3A5F; color:#fff !important; text-decoration:none; text-align:center; border-radius:10px; font-size:13px; font-weight:600; }
  .store { margin-bottom:22px; border:1px solid #ECEFF3; border-radius:12px; overflow:hidden; }
  .store:last-child { margin-bottom:8px; }
  .store h2 { margin:0; padding:12px 16px; font-size:13px; font-weight:700; color:#111; background:#F7F9FC; border-bottom:1px solid #ECEFF3; }
  .stats { width:100%; border-collapse:collapse; }
  .stats td { width:50%; padding:14px 16px; vertical-align:top; }
  .stats .label { display:block; margin:0 0 4px; font-size:10px; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; color:#95A0AD; }
  .stats .value { display:block; font-size:17px; font-weight:700; color:#111; }
  .stats .value.accent { color:#1E3A5F; }
  .footer { padding:18px 32px 26px; font-size:11px; color:#aaa; text-align:center; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <p class="eyebrow">Seissense Ops</p>
    <h1>${title}</h1>
  </div>
  <div class="body">${content}</div>
  <div class="footer">Automated by Seissense Ops Bot · ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Bahrain" })} (Bahrain)</div>
</div>
</body></html>`;
}

function buildContent(report: DailySalesReport, reportUrl: string): string {
  const stores = report.stores
    .map(
      (s) => `
      <div class="store">
        <h2>${s.store}</h2>
        <table class="stats">
          <tr>
            <td><span class="label">Orders</span><span class="value">${s.orderCount}</span></td>
            <td><span class="label">Units sold</span><span class="value">${s.unitsSold}</span></td>
          </tr>
          <tr>
            <td><span class="label">Total sales</span><span class="value accent">${formatMoney(s.totalSales, s.currency)}</span></td>
            <td><span class="label">Discounts given</span><span class="value">${formatMoney(s.totalDiscounts, s.currency)}</span></td>
          </tr>
        </table>
      </div>`,
    )
    .join("");
  return `<a class="cta" href="${reportUrl}">View full report — order list, top products, history</a>
    <div class="note">Staff-created orders (completed from a draft order) are excluded from these totals.</div>
    ${stores}`;
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
