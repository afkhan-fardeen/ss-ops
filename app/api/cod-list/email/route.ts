import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { monthLabel } from "@/lib/cod/cod-list-month";
import { loadCodListData } from "@/lib/cod/cod-list-data";
import { loadCodListByMonth } from "@/lib/cod/load-cod-list-by-month";
import { codFilenameForDateKeys } from "@/lib/excel";
import { sendCodListEmail } from "@/lib/email/send-cod-email";

/** POST /api/cod-list/email — day selection (?dates= / ?date=) or monthly (?month=YYYY-MM). */
export async function POST(req: Request) {
  let session: Awaited<ReturnType<typeof requireSession>>;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const u = new URL(req.url);
  const month = u.searchParams.get("month")?.trim();
  const data = month
    ? await loadCodListByMonth(month)
    : await loadCodListData({
        dates: u.searchParams.get("dates") ?? undefined,
        date: u.searchParams.get("date") ?? undefined,
      });

  if (!data.ok) {
    return NextResponse.json({ ok: false, error: data.error }, { status: 400 });
  }

  try {
    const totalGbp = data.codOrders.reduce((s, o) => s + Number.parseFloat(o.total_price || "0"), 0);
    const result = await sendCodListEmail({
      rows: data.rows,
      orderCount: data.codOrders.length,
      totalGbp,
      windowStart: data.rangeStartIso,
      windowEnd: data.rangeEndIso,
      sentByEmail: session.email ?? null,
      ...(month
        ? {
            attachmentFilename: codFilenameForDateKeys(data.dateKeys),
            subjectLabel: monthLabel(month),
          }
        : {}),
    });

    if (!result.ok) return NextResponse.json(result, { status: 500 });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed to send" }, { status: 500 });
  }
}
