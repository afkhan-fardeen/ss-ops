import { NextRequest, NextResponse } from "next/server";
import { PortalAuthError } from "@/lib/auth/require-portal-admin";
import { requireModuleAccess } from "@/lib/auth/can-access-module";
import { groupBalanceRowsByName } from "@/lib/ubex/group-balance-rows-by-name";
import {
  fetchUbexInventoryPage,
  searchUbexInventory,
  UBEX_INVENTORY_PAGE_SIZE,
} from "@/lib/ubex/inventory";
import { enrichUbexStock, joinUbexItemsToShopify } from "@/lib/stock/join-ubex-shopify";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** GET /api/ubex-inventory/search?q=&page= — Ubex + Shopify committed pool, grouped by name. */
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
    let items = q
      ? await searchUbexInventory(q, page)
      : await fetchUbexInventoryPage(page);
    items = await enrichUbexStock(items);
    const joined = await joinUbexItemsToShopify(items);
    const products = groupBalanceRowsByName(joined.rows);
    return NextResponse.json({
      ok: true,
      products,
      page,
      hasNextPage: items.length >= UBEX_INVENTORY_PAGE_SIZE,
      store2Configured: joined.store2Configured,
      itemCount: products.length,
      variantCount: items.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load Ubex inventory";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
