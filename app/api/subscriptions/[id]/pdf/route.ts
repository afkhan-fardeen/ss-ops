import { NextRequest, NextResponse } from "next/server";
import { downloadSubscriptionPdf, getSubscriptionRequest } from "@/lib/subscriptions/db";
import { fillSubscriptionPdf } from "@/lib/subscriptions/fill-pdf";
import { requireSubscriptionAdmin } from "@/lib/subscriptions/require-admin";

type RouteCtx = { params: Promise<{ id: string }> | { id: string } };

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const auth = await requireSubscriptionAdmin();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: auth.status });
  }

  const p = await Promise.resolve(ctx.params);
  const row = await getSubscriptionRequest(p.id);
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  let bytes: ArrayBuffer | Uint8Array | null = null;
  if (row.pdf_storage_path) {
    bytes = await downloadSubscriptionPdf(row.pdf_storage_path);
  }

  if (!bytes) {
    try {
      bytes = await fillSubscriptionPdf(row);
    } catch (e) {
      console.error("[subscriptions/pdf]", e);
      return NextResponse.json({ ok: false, error: "PDF unavailable" }, { status: 502 });
    }
  }

  const buffer = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${row.reference_number}.pdf"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
