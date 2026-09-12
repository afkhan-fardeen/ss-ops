import { NextResponse, type NextRequest } from "next/server";
import { loadDailySalesReport } from "@/lib/sales/daily-sales-report";
import { sendDailySalesEmail } from "@/lib/email/send-daily-sales-email";

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
function checkAuth(req: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return null;
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const unauthorized = checkAuth(req);
  if (unauthorized) return unauthorized;

  const dryRun = req.nextUrl.searchParams.get("dry_run") === "true";
  const offsetParam = req.nextUrl.searchParams.get("offset");
  const offsetDays = offsetParam !== null ? Number.parseInt(offsetParam, 10) : -1;

  const report = await loadDailySalesReport(Number.isFinite(offsetDays) ? offsetDays : -1);

  if (dryRun) {
    return NextResponse.json({ ok: true, dry_run: true, report });
  }

  const emailResult = await sendDailySalesEmail(report);
  return NextResponse.json({ ok: emailResult.ok, dry_run: false, report, email: emailResult });
}

// Allow GET as a lightweight check that the route/auth is wired correctly.
export async function GET(req: NextRequest) {
  const unauthorized = checkAuth(req);
  if (unauthorized) return unauthorized;
  return NextResponse.json({ ok: true, endpoint: "daily-sales-report" });
}
