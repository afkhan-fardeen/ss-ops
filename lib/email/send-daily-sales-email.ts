import { isEmailConfigured, sendEmail } from "@/lib/email/send-email";
import { getSupabaseService } from "@/lib/supabase/service";
import type { DailySalesReport } from "@/lib/sales/daily-sales-report";
import { buildSalesReportWorkbook, salesReportFilename } from "@/lib/sales/build-sales-report-workbook";
import { buildSalesReportEmail } from "@/lib/email/sales-report-template";

const RECIPIENTS_KEY = "sales_report_emails";

async function getSalesReportRecipients(): Promise<string[]> {
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

export async function sendDailySalesEmail(
  report: DailySalesReport,
  portalBaseUrl: string,
  opts?: { /** Send to these addresses instead of the configured recipient list (tests/previews). */ to?: string[] },
): Promise<{ ok: boolean; sent: boolean; recipients: number; error?: string }> {
  const recipients = opts?.to?.length ? opts.to : await getSalesReportRecipients();
  if (recipients.length === 0) return { ok: true, sent: false, recipients: 0 };

  if (!isEmailConfigured()) return { ok: false, sent: false, recipients: 0, error: "Email is not configured (RESEND_API_KEY)." };

  const reportUrl = `${portalBaseUrl}/sales-report?day=${report.day.dateKey}`;
  const { subject, html, text } = buildSalesReportEmail(report, reportUrl);
  try {
    const workbook = await buildSalesReportWorkbook(report);
    const attachmentBuffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
    await sendEmail({
      to: recipients,
      subject,
      html,
      text,
      attachments: [
        { filename: salesReportFilename(report.day.dateKey), content: Buffer.from(attachmentBuffer) },
      ],
    });
    return { ok: true, sent: true, recipients: recipients.length };
  } catch (e) {
    return { ok: false, sent: false, recipients: recipients.length, error: e instanceof Error ? e.message : "Failed to send" };
  }
}
