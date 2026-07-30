import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { fetchInvoiceForOrder } from "@/lib/zoho/fetch-invoice";

/**
 * GET /api/invoice?orderName=1234
 *
 * Fetches the Zoho Books invoice PDF for the given Shopify order number.
 * Streams the PDF bytes directly — the client creates a blob: URL for the iframe.
 *
 * On failure: returns JSON { ok: false, error, reason } so the UI can show a
 * clear error on the invoice side without affecting the AWB side.
 */
export async function GET(req: NextRequest) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const orderName = req.nextUrl.searchParams.get("orderName")?.trim() ?? "";
  if (!orderName) {
    return NextResponse.json(
      { ok: false, error: "orderName is required", reason: "validation" },
      { status: 400 },
    );
  }

  const result = await fetchInvoiceForOrder(orderName);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, reason: result.reason },
      { status: result.reason === "not_found" ? 404 : 502 },
    );
  }

  return new NextResponse(result.pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${orderName}.pdf"`,
      "Cache-Control": "no-store",
      "X-Invoice-Number": result.invoiceNumber,
    },
  });
}
