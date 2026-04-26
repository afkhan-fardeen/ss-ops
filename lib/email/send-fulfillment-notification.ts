/**
 * Sends fulfillment-related notification emails after the auto-sync cron runs.
 *
 * Two distinct emails:
 *  • sendFulfillmentNotification – sent when ≥1 order is successfully fulfilled
 *  • sendErrorNotification       – sent when ≥1 order fails
 *
 * Recipients come from cod_settings keys:
 *  • fulfillment_notify_emails
 *  • error_notify_emails
 */

import nodemailer from "nodemailer";
import { getSupabaseService } from "@/lib/supabase/service";

// ── Shared ─────────────────────────────────────────────────────────

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (!user || !pass) return null;
  return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}

async function getRecipientsForKey(key: string): Promise<string[]> {
  try {
    const supabase = getSupabaseService();
    if (supabase) {
      const { data } = await supabase
        .from("cod_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      const raw = (data as { value: string } | null)?.value ?? "";
      const list = raw.split(",").map((e) => e.trim()).filter(Boolean);
      if (list.length > 0) return list;
    }
  } catch { /* fall through */ }
  return [];
}

// ── Types ──────────────────────────────────────────────────────────

export type FulfilledOrder = {
  order: string;
  tracking: string;
  trackingUrl?: string;
};

export type FailedOrder = {
  order: string;
  tracking: string;
  detail?: string;
};

// ── HTML helpers ───────────────────────────────────────────────────

function htmlWrap(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { margin:0; padding:0; background:#F7F7F7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
  .wrapper { max-width:580px; margin:32px auto; background:#fff; border-radius:12px; overflow:hidden; border:1px solid #EBEBEB; }
  .header { padding:28px 32px 20px; border-bottom:1px solid #EBEBEB; }
  .header h1 { margin:0; font-size:18px; font-weight:700; color:#111; }
  .header p  { margin:6px 0 0; font-size:13px; color:#777; }
  .body { padding:24px 32px; }
  table { width:100%; border-collapse:collapse; margin-top:16px; font-size:13px; }
  th { text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#999; padding:8px 10px; background:#F7F7F7; border-bottom:1px solid #EBEBEB; }
  td { padding:10px 10px; border-bottom:1px solid #F7F7F7; color:#111; vertical-align:top; }
  tr:last-child td { border-bottom:none; }
  .badge-ok  { display:inline-block; padding:2px 8px; border-radius:99px; background:rgba(76,175,80,.12); color:#3d8b40; font-size:11px; font-weight:600; }
  .badge-err { display:inline-block; padding:2px 8px; border-radius:99px; background:rgba(194,81,81,.12); color:#b33; font-size:11px; font-weight:600; }
  .mono      { font-family: 'Courier New', monospace; font-size:12px; }
  a          { color:#111; }
  .footer    { padding:16px 32px; border-top:1px solid #EBEBEB; font-size:11px; color:#aaa; }
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

// ── sendFulfillmentNotification ────────────────────────────────────

export async function sendFulfillmentNotification(params: {
  fulfilled: FulfilledOrder[];
  skipped: number;
  checked: number;
  dryRun: boolean;
}): Promise<void> {
  if (params.fulfilled.length === 0) return;

  const recipients = await getRecipientsForKey("fulfillment_notify_emails");
  if (recipients.length === 0) return;

  const transporter = getTransporter();
  if (!transporter) return;

  const { fulfilled, skipped, checked, dryRun } = params;
  const prefix = dryRun ? "[DRY RUN] " : "";
  const subject = `${prefix}✓ ${fulfilled.length} order${fulfilled.length !== 1 ? "s" : ""} fulfilled — Seissense Ops Bot`;

  const rows = fulfilled
    .map(
      (o) => `<tr>
        <td class="mono">${o.order}</td>
        <td class="mono">${o.tracking}</td>
        <td>${o.trackingUrl ? `<a href="${o.trackingUrl}">${o.tracking}</a>` : "—"}</td>
        <td><span class="badge-ok">Fulfilled</span></td>
      </tr>`,
    )
    .join("");

  const content = `
    <p style="color:#333;font-size:14px;margin:0 0 8px;">
      <strong>${fulfilled.length}</strong> order${fulfilled.length !== 1 ? "s were" : " was"} automatically fulfilled in Shopify
      with Ubex tracking links${dryRun ? " <em>(dry-run — no real changes)</em>" : ""}.
    </p>
    <p style="color:#777;font-size:13px;margin:0 0 20px;">
      Checked <strong>${checked}</strong> pending · Fulfilled <strong>${fulfilled.length}</strong> · Skipped <strong>${skipped}</strong>
    </p>
    <table>
      <thead><tr><th>Order</th><th>Ubex ID</th><th>Tracking Link</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  try {
    await transporter.sendMail({
      from: `Seissense Ops <${process.env.GMAIL_USER}>`,
      to: recipients.join(", "),
      subject,
      html: htmlWrap(subject, content),
    });
  } catch (e) {
    console.error("[notify] fulfillment email failed:", e);
  }
}

// ── sendErrorNotification ──────────────────────────────────────────

export async function sendErrorNotification(params: {
  errors: FailedOrder[];
  fulfilled: number;
  checked: number;
}): Promise<void> {
  if (params.errors.length === 0) return;

  const recipients = await getRecipientsForKey("error_notify_emails");
  if (recipients.length === 0) return;

  const transporter = getTransporter();
  if (!transporter) return;

  const { errors, fulfilled, checked } = params;
  const subject = `⚠ ${errors.length} auto-fulfill error${errors.length !== 1 ? "s" : ""} — Seissense Ops Bot`;

  const rows = errors
    .map(
      (o) => `<tr>
        <td class="mono">${o.order}</td>
        <td class="mono">${o.tracking}</td>
        <td style="color:#b33">${o.detail ?? "Unknown error"}</td>
      </tr>`,
    )
    .join("");

  const content = `
    <p style="color:#b33;font-size:14px;margin:0 0 8px;">
      <strong>${errors.length}</strong> order${errors.length !== 1 ? "s" : ""} could not be fulfilled during the Seissense Ops Bot run.
    </p>
    <p style="color:#777;font-size:13px;margin:0 0 20px;">
      Checked <strong>${checked}</strong> · Fulfilled <strong>${fulfilled}</strong> · Failed <strong>${errors.length}</strong>
    </p>
    <table>
      <thead><tr><th>Order</th><th>Ubex ID</th><th>Error</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin:20px 0 0;font-size:12px;color:#999;">
      Check the portal's History page or Shopify Admin for more details.
    </p>`;

  try {
    await transporter.sendMail({
      from: `Seissense Ops <${process.env.GMAIL_USER}>`,
      to: recipients.join(", "),
      subject,
      html: htmlWrap(subject, content),
    });
  } catch (e) {
    console.error("[notify] error email failed:", e);
  }
}
