import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/auth/verify-cron";
import { getBahrainCalendarDay } from "@/lib/datetime/bahrain-time";
import { loadDailySalesReport } from "@/lib/sales/daily-sales-report";
import { sendDailySalesEmail } from "@/lib/email/send-daily-sales-email";
import { resolvePortalBaseUrl } from "@/lib/portal-url";

/**
 * POST /api/sync/daily-sales-report
 *
 * Cron endpoint — scheduled daily via Vercel Cron (see vercel.json). Summarizes
 * the previous full Bahrain calendar day's orders for both stores and emails
 * the report to recipients set in cod_settings.sales_report_emails.
 *
 * Query params:
 *   ?dry_run=true   compute and return the report only — no email sent. Useful
 *                    for testing (curl -X POST ".../daily-sales-report?dry_run=true").
 *   ?offset=-1       which Bahrain calendar day to report on (default -1 = yesterday).
 *
 * Auth: expects  Authorization: Bearer <CRON_SECRET>
 */
export async function POST(req: NextRequest) {
  const denied = verifyCronRequest(req);
  if (denied) return denied;

  const dryRun = req.nextUrl.searchParams.get("dry_run") === "true";
  const offsetParam = req.nextUrl.searchParams.get("offset");
  const offsetDays = offsetParam !== null ? Number.parseInt(offsetParam, 10) : -1;

  const day = getBahrainCalendarDay(Number.isFinite(offsetDays) ? offsetDays : -1);
  const report = await loadDailySalesReport(day);

  if (dryRun) {
    return NextResponse.json({ ok: true, dry_run: true, report });
  }

  const emailResult = await sendDailySalesEmail(report, resolvePortalBaseUrl(req));
  return NextResponse.json({ ok: emailResult.ok, dry_run: false, report, email: emailResult });
}

// Allow GET as a lightweight check that the route/auth is wired correctly.
export async function GET(req: NextRequest) {
  const denied = verifyCronRequest(req);
  if (denied) return denied;
  return NextResponse.json({ ok: true, endpoint: "daily-sales-report" });
}
