import { NextResponse, type NextRequest } from "next/server";
import { PortalAuthError } from "@/lib/auth/require-portal-admin";
import { requireModuleAccess } from "@/lib/auth/can-access-module";
import { fetchUbexInventoryAll, UBEX_INVENTORY_PAGE_SIZE } from "@/lib/ubex/inventory";
import { buildUbexInventoryWorkbook, ubexInventoryFilename } from "@/lib/ubex/build-ubex-inventory-workbook";
import { getUbexExportEstimate, saveUbexExportEstimate } from "@/lib/ubex/export-estimate";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

type ProgressEvent =
  | { type: "progress"; fetched: number; elapsedMs: number; percent: number | null; etaMs: number | null }
  | { type: "done"; filename: string; totalItems: number; base64: string }
  | { type: "error"; error: string };

/**
 * GET /api/ubex-inventory/download/progress — same export as /download, streamed as
 * Server-Sent Events so the client can render a live % + ETA while Ubex's paginated
 * (throttled, 10-items/page) API is the bottleneck, not the download itself.
 */
export async function GET(_req: NextRequest) {
  try {
    await requireModuleAccess("ubexInventory");
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
          send({ type: "progress", fetched, elapsedMs, percent, etaMs });
        });

        const wb = await buildUbexInventoryWorkbook(items);
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
