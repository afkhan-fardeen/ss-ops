import { NextResponse, type NextRequest } from "next/server";
import { getBahrainCalendarDay, getBahrainCalendarDayForKey } from "@/lib/datetime/collection-window";
import { loadDailySalesReport } from "@/lib/sales/daily-sales-report";
import { buildSalesReportWorkbook, salesReportFilename } from "@/lib/sales/build-sales-report-workbook";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/sales-report/download?day=YYYY-MM-DD — downloads that day's report as an .xlsx.
 * Deliberately public (see middleware.ts PUBLIC_EXACT_PATHS) — same "anyone with the link"
 * model as the report page itself. Only ever returns the one requested day's figures.
 */
export async function GET(req: NextRequest) {
  const dayKey = req.nextUrl.searchParams.get("day");
  const day =
    dayKey && DATE_KEY_RE.test(dayKey) ? getBahrainCalendarDayForKey(dayKey) : getBahrainCalendarDay(-1);

  const report = await loadDailySalesReport(day);
  const wb = await buildSalesReportWorkbook(report);
  const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${salesReportFilename(day.dateKey)}"`,
      "Cache-Control": "no-store",
    },
  });
}
