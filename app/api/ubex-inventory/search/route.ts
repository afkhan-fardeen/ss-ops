import { NextRequest, NextResponse } from "next/server";
import { PortalAuthError } from "@/lib/auth/require-portal-admin";
import { requireModuleAccess } from "@/lib/auth/can-access-module";
import { groupUbexItemsByName } from "@/lib/ubex/group-by-name";
import {
  fetchUbexInventoryPage,
  searchUbexInventory,
  UBEX_INVENTORY_PAGE_SIZE,
} from "@/lib/ubex/inventory";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET /api/ubex-inventory/search?q=&page= — Ubex-only grouped inventory. */
export async function GET(req: NextRequest) {
  try {
    await requireModuleAccess("ubexInventory");
  } catch (e) {
    if (e instanceof PortalAuthError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const pageRaw = Number.parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  try {
    const items = q
      ? await searchUbexInventory(q, page)
      : await fetchUbexInventoryPage(page);
    const products = groupUbexItemsByName(items);
    return NextResponse.json({
      ok: true,
      products,
      page,
      hasNextPage: items.length >= UBEX_INVENTORY_PAGE_SIZE,
      itemCount: products.length,
      variantCount: items.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load Ubex inventory";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
