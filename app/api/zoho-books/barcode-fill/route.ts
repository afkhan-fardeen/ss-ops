import { NextRequest, NextResponse } from "next/server";
import { PortalAuthError } from "@/lib/auth/require-portal-admin";
import { requireModuleAccess } from "@/lib/auth/can-access-module";
import { findBarcodeMatchCandidates } from "@/lib/zoho/match-barcode-candidates";
import { updateZohoItemBarcode } from "@/lib/zoho/update-item-barcode";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const FILL_CHUNK_SIZE = 15;

type FillBody = {
  itemIds?: string[];
};

/** POST /api/zoho-books/barcode-fill — write Ubex Barcode to selected Zoho items. */
export async function POST(req: NextRequest) {
  try {
    await requireModuleAccess("zohoBooks");
  } catch (e) {
    if (e instanceof PortalAuthError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: FillBody;
  try {
    body = (await req.json()) as FillBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const itemIds = [...new Set((body.itemIds ?? []).map((id) => id.trim()).filter(Boolean))];
  if (itemIds.length === 0) {
    return NextResponse.json({ ok: false, error: "itemIds is required" }, { status: 400 });
  }

  const scan = await findBarcodeMatchCandidates();
  if (!scan.ok) {
    return NextResponse.json({ ok: false, error: scan.error }, { status: 502 });
  }

  const byId = new Map(scan.candidates.map((c) => [c.zohoItemId, c]));
  const results: Array<{
    itemId: string;
    ok: boolean;
    error?: { category: string; userMessage: string; detail: string; httpStatus?: number };
  }> = [];

  for (let i = 0; i < itemIds.length; i += FILL_CHUNK_SIZE) {
    const chunk = itemIds.slice(i, i + FILL_CHUNK_SIZE);
    for (const itemId of chunk) {
      const candidate = byId.get(itemId);
      if (!candidate) {
        results.push({
          itemId,
          ok: false,
          error: {
            category: "unknown",
            userMessage: "This item wasn't in the last scan — re-scan and try again.",
            detail: "Item ID not found in cached scan results",
          },
        });
        continue;
      }
      if (candidate.status !== "clean" || !candidate.proposedBarcode) {
        results.push({
          itemId,
          ok: false,
          error: {
            category: "unknown",
            userMessage: "Only clean matches can be filled — this row has no safe barcode to write.",
            detail: `status=${candidate.status}`,
          },
        });
        continue;
      }

      const update = await updateZohoItemBarcode(itemId, candidate.proposedBarcode);
      if (update.ok) {
        results.push({ itemId, ok: true });
      } else {
        results.push({ itemId, ok: false, error: update.error });
      }
    }
  }

  return NextResponse.json({ ok: true, results });
}
