import { NextRequest, NextResponse } from "next/server";
import { PortalAuthError } from "@/lib/auth/require-portal-admin";
import { requireModuleAccess } from "@/lib/auth/can-access-module";
import {
  loadStockBalancePage,
  searchStockBalance,
} from "@/lib/stock/load-stock-balance-preview";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** GET /api/stock-balance/preview?search=&page= — scoped Ubex page + both stores. */
export async function GET(req: NextRequest) {
  try {
    await requireModuleAccess("stock");
  } catch (e) {
    if (e instanceof PortalAuthError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";
  const pageRaw = Number.parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  try {
    const preview = search
      ? await searchStockBalance(search, page)
      : await loadStockBalancePage(page);
    return NextResponse.json({ ok: true, ...preview });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load stock balance";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
