import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { isPortalAdmin } from "@/lib/auth/is-portal-admin";
import { loadDailySalesReport } from "@/lib/sales/daily-sales-report";
import { sendDailySalesEmail } from "@/lib/email/send-daily-sales-email";

/** POST /api/sales-report/send — manual "send now" trigger from the Sales Report page. Admin only. */
export async function POST(req: Request) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isPortalAdmin())) {
    return NextResponse.json({ ok: false, error: "Admin access required" }, { status: 403 });
  }

  const url = new URL(req.url);
  const offsetParam = url.searchParams.get("offset");
  const offsetDays = offsetParam !== null ? Number.parseInt(offsetParam, 10) : -1;

  const report = await loadDailySalesReport(Number.isFinite(offsetDays) ? offsetDays : -1);
  const result = await sendDailySalesEmail(report);

  return NextResponse.json({ ok: result.ok, report, email: result });
}
