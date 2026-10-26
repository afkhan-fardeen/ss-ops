import { NextResponse, type NextRequest } from "next/server";
import { PortalAuthError } from "@/lib/auth/require-portal-admin";
import { requireModuleAccess } from "@/lib/auth/can-access-module";
import { fetchUbexInventoryAll, UBEX_INVENTORY_PAGE_SIZE } from "@/lib/ubex/inventory";
import { fetchAllShopifyInventoryAtLocation, getDefaultShopifyLocation } from "@/lib/shopify/inventory-read";
import { isStore2Configured } from "@/lib/store2/client";
import { buildStockBalanceRows } from "@/lib/stock/build-balance-rows";
import { buildUbexInventoryWorkbook, ubexInventoryFilename } from "@/lib/ubex/build-ubex-inventory-workbook";
import { getUbexExportEstimate, saveUbexExportEstimate } from "@/lib/ubex/export-estimate";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

type ProgressEvent =
  | {
      type: "progress";
      phase: "fetching" | "matching";
      fetched: number;
      elapsedMs: number;
      percent: number | null;
      etaMs: number | null;
    }
  | { type: "done"; filename: string; totalItems: number; base64: string }
  | { type: "error"; error: string };

/**
 * GET /api/ubex-inventory/download/progress — same export as /download, streamed as
 * Server-Sent Events so the client can render a live % + ETA. Ubex's paginated
 * (throttled, 10-items/page) API is the bottleneck for the "fetching" phase; matching
 * against both stores' committed quantities ("matching" phase) is fast by comparison.
 */
export async function GET(_req: NextRequest) {
  try {
    await requireModuleAccess("stock");
  } catch (e) {
    if (e instanceof PortalAuthError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ProgressEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      const startedAt = Date.now();

      try {
        const estimatedTotalItems = await getUbexExportEstimate();
        const estimatedTotalPages = estimatedTotalItems
          ? Math.ceil(estimatedTotalItems / UBEX_INVENTORY_PAGE_SIZE)
          : null;

        const items = await fetchUbexInventoryAll(null, (fetched, pagesFetched) => {
          const elapsedMs = Date.now() - startedAt;
          const rate = pagesFetched / elapsedMs; // pages per ms
          const remainingPages =
            estimatedTotalPages !== null ? Math.max(0, estimatedTotalPages - pagesFetched) : null;
          const etaMs =
            remainingPages !== null && rate > 0 ? Math.round(remainingPages / rate) : null;
          const percent =
            estimatedTotalPages !== null
              ? Math.min(99, Math.round((pagesFetched / estimatedTotalPages) * 100))
              : null;
          send({ type: "progress", phase: "fetching", fetched, elapsedMs, percent, etaMs });
        });

        send({
          type: "progress",
          phase: "matching",
          fetched: items.length,
          elapsedMs: Date.now() - startedAt,
          percent: 99,
          etaMs: null,
        });

        const store2Configured = isStore2Configured();
        const location = await getDefaultShopifyLocation(1);
        const storeAPromise = fetchAllShopifyInventoryAtLocation(location.id, 1);
        const storeBPromise = store2Configured
          ? getDefaultShopifyLocation(2).then((locationB) =>
              fetchAllShopifyInventoryAtLocation(locationB.id, 2),
            )
          : Promise.resolve(null);
        const [storeAByBarcode, storeBByBarcode] = await Promise.all([storeAPromise, storeBPromise]);

        const rows = buildStockBalanceRows(items, storeAByBarcode, storeBByBarcode);
        const wb = await buildUbexInventoryWorkbook(rows, store2Configured);
        const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
        const base64 = Buffer.from(buf).toString("base64");

        await saveUbexExportEstimate(items.length);

        send({ type: "done", filename: ubexInventoryFilename(), totalItems: items.length, base64 });
      } catch (e) {
        send({ type: "error", error: e instanceof Error ? e.message : "Export failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
