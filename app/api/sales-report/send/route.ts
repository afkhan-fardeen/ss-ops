import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { isPortalAdmin } from "@/lib/auth/is-portal-admin";
import {
  getBahrainCalendarDay,
  getBahrainCalendarDayForKey,
} from "@/lib/datetime/collection-window";
import { loadDailySalesReport } from "@/lib/sales/daily-sales-report";
import { sendDailySalesEmail } from "@/lib/email/send-daily-sales-email";
import { resolvePortalBaseUrl } from "@/lib/portal-url";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** POST /api/sales-report/send — manual "send now" trigger from the Sales Report page. Admin only. */
export async function POST(req: NextRequest) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isPortalAdmin())) {
    return NextResponse.json({ ok: false, error: "Admin access required" }, { status: 403 });
  }

  const dayKey = req.nextUrl.searchParams.get("day");
  const offsetParam = req.nextUrl.searchParams.get("offset");
  const offsetDays = offsetParam !== null ? Number.parseInt(offsetParam, 10) : -1;

  const day =
    dayKey && DATE_KEY_RE.test(dayKey)
      ? getBahrainCalendarDayForKey(dayKey)
      : getBahrainCalendarDay(Number.isFinite(offsetDays) ? offsetDays : -1);

  const report = await loadDailySalesReport(day);
  const result = await sendDailySalesEmail(report, resolvePortalBaseUrl(req));

  return NextResponse.json({ ok: result.ok, report, email: result });
}
