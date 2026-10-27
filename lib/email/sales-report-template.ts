import type { DailySalesReport, StoreSalesSummary } from "@/lib/sales/daily-sales-report";
import { escapeHtml } from "@/lib/email/escape-html";

// Email-safe: table layout + inline styles (Gmail/Outlook/Apple Mail), no external assets.
const INK = "#0F172A";
const MUTED = "#5B6B82";
const LINE = "#E2E8F0";
const CANVAS = "#F1F5F9";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const ACCENT = "#2563EB"; // single accent colour; everything else is neutral

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function kpi(label: string, value: string): string {
  return `<td width="50%" valign="top" style="padding:6px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CANVAS};border-radius:10px;">
      <tr><td style="padding:12px 14px;">
        <div style="font-size:12px;line-height:16px;color:${MUTED};">${label}</div>
        <div style="margin-top:2px;font-size:20px;line-height:28px;font-weight:700;color:${INK};">${value}</div>
      </td></tr>
    </table>
  </td>`;
}

function storeCard(s: StoreSalesSummary): string {
  const avg = s.orderCount > 0 ? s.totalSales / s.orderCount : 0;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid ${LINE};border-top:4px solid ${ACCENT};border-radius:12px;">
    <tr><td style="padding:0;">
      <div style="padding:16px 16px 8px 16px;">
        <div style="font-size:16px;line-height:24px;font-weight:700;color:${INK};">${escapeHtml(s.store)}</div>
        <div style="font-size:12px;line-height:16px;color:${MUTED};">Currency: ${escapeHtml(s.currency)}</div>
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:0 10px;">
        <tr>${kpi("Total sales", formatMoney(s.totalSales, s.currency))}${kpi("Orders", String(s.orderCount))}</tr>
        <tr>${kpi("Units sold", String(s.unitsSold))}${kpi("Avg. order value", formatMoney(avg, s.currency))}</tr>
      </table>
      <div style="padding:4px 16px 16px 16px;font-size:12px;line-height:16px;color:${MUTED};">Discounts given: <strong style="color:${INK};">${formatMoney(s.totalDiscounts, s.currency)}</strong></div>
    </td></tr>
  </table>`;
}

export function buildSalesReportEmail(report: DailySalesReport, reportUrl: string): { subject: string; html: string; text: string } {
  const subject = `Daily sales report — ${report.day.label}`;
  const generated = new Date().toLocaleString("en-GB", { timeZone: "Asia/Bahrain", dateStyle: "medium", timeStyle: "short" });
  const totalOrders = report.stores.reduce((n, s) => n + s.orderCount, 0);
  const preheader = report.stores.map((s) => `${s.store}: ${formatMoney(s.totalSales, s.currency)} from ${s.orderCount} orders`).join(" · ");

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${CANVAS};font-family:${FONT};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CANVAS};"><tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid ${LINE};">
    <tr><td style="background:${ACCENT};padding:28px 28px 24px 28px;">
      <div style="font-size:13px;line-height:16px;font-weight:700;letter-spacing:.08em;color:#BFDBFE;text-transform:uppercase;">Seissense Ops</div>
      <div style="margin-top:6px;font-size:24px;line-height:32px;font-weight:700;color:#FFFFFF;">Daily sales report</div>
      <div style="margin-top:2px;font-size:14px;line-height:20px;color:#DBEAFE;">${escapeHtml(report.day.label)} · ${totalOrders} order${totalOrders === 1 ? "" : "s"} across both stores</div>
    </td></tr>
    <tr><td style="padding:8px 22px 28px 22px;">
      ${report.stores.map((s) => storeCard(s)).join("")}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr><td align="center">
        <a href="${escapeHtml(reportUrl)}" style="display:inline-block;background:${ACCENT};color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;line-height:20px;padding:13px 26px;border-radius:10px;">View the full report</a>
      </td></tr><tr><td align="center" style="padding-top:12px;font-size:12px;line-height:16px;color:${MUTED};">The Excel workbook with every order is attached.</td></tr></table>
    </td></tr>
    <tr><td style="background:${CANVAS};padding:16px 28px;font-size:12px;line-height:18px;color:${MUTED};">
      Cancelled orders and staff-created draft orders are excluded. Day = Bahrain calendar day (UTC+3).<br>
      Generated ${escapeHtml(generated)} (Bahrain) by Seissense Ops.
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const text = [
    subject,
    "",
    ...report.stores.flatMap((s) => [
      s.store,
      `  Total sales: ${formatMoney(s.totalSales, s.currency)}`,
      `  Orders: ${s.orderCount}  ·  Units: ${s.unitsSold}  ·  Discounts: ${formatMoney(s.totalDiscounts, s.currency)}`,
      "",
    ]),
    `Full report: ${reportUrl}`,
    "Excel workbook attached. Cancelled and draft orders excluded.",
  ].join("\n");

  return { subject, html, text };
}
