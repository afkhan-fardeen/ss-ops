import { NextRequest, NextResponse } from "next/server";
import { PortalAuthError } from "@/lib/auth/require-portal-admin";
import { requireModuleAccess } from "@/lib/auth/can-access-module";
import { computeCommitment } from "@/lib/analysis/commitment";
import {
  getProductSalesRank,
  getUnitsSoldByStore,
  getUnitsSoldForBarcode,
  type SalesWindow,
} from "@/lib/analysis/sales-aggregates";
import { searchStockBalance } from "@/lib/stock/load-stock-balance-preview";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function parseWindow(raw: string | null): SalesWindow {
  if (raw === "7" || raw === "14" || raw === "30" || raw === "90") {
    return Number(raw) as SalesWindow;
  }
  if (raw === "all-time") return "all-time";
  return 30;
}

/** GET /api/stock-analysis/product?search=&window=30 — read-only product commitment + sales. */
export async function GET(req: NextRequest) {
  try {
    await requireModuleAccess("stockAnalysis");
  } catch (e) {
    if (e instanceof PortalAuthError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";
  const window = parseWindow(req.nextUrl.searchParams.get("window"));

  if (!search) {
    return NextResponse.json({ ok: false, error: "Missing search query" }, { status: 400 });
  }

  try {
    const preview = await searchStockBalance(search, 1);
    const row = preview.rows[0];
    if (!row) {
      return NextResponse.json({ ok: true, found: false });
    }

    const commitment = computeCommitment({
      ubexStock: row.ubexStock,
      storeACommitted: row.storeA.committed,
      storeBCommitted: row.storeB?.committed,
    });

    const [unitsSold, byStore, rank] = await Promise.all([
      getUnitsSoldForBarcode(row.barcode, window, undefined, row.sku),
      getUnitsSoldByStore(row.barcode, window, row.sku),
      getProductSalesRank(row.barcode, window, 10, row.sku),
    ]);

    return NextResponse.json({
      ok: true,
      found: true,
      product: {
        productName: row.productName,
        sku: row.sku,
        barcode: row.barcode,
        ubexStock: row.ubexStock,
        storeA: {
          onHand: row.storeA.onHand,
          available: row.storeA.available,
          committed: row.storeA.committed,
        },
        storeB: row.storeB
          ? {
              onHand: row.storeB.onHand,
              available: row.storeB.available,
              committed: row.storeB.committed,
            }
          : null,
        commitment,
        sales: {
          window,
          unitsSold,
          storeA: byStore.storeA,
          storeB: byStore.storeB,
          rank,
        },
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load product";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
