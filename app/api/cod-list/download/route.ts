import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { loadCodListData } from "@/lib/cod/cod-list-data";
import { loadCodListByMonth } from "@/lib/cod/load-cod-list-by-month";
import { buildCodWorkbook, codFilenameForDateKeys } from "@/lib/excel";

export async function GET(req: Request) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json({ error: data.error }, { status: 400 });
  }

  try {
    const wb = await buildCodWorkbook(data.rows);
    const filename = codFilenameForDateKeys(data.dateKeys);
    const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
