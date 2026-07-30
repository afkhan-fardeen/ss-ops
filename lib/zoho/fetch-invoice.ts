import { zohoFetch } from "./client";

export type InvoiceResult =
  | { ok: true; pdfBytes: ArrayBuffer; invoiceNumber: string }
  | { ok: false; error: string; reason: "not_found" | "zoho_error" };

/** PO number prefixes used in Zoho Books (e.g. MOVE-252641, GCC-252641). */
const PO_PREFIXES = ["MOVE", "GCC"] as const;

type ZohoInvoiceListResponse = {
  code?: number;
  message?: string;
  invoices?: Array<{
    invoice_id: string;
    invoice_number: string;
    purchaseorder_number?: string;
  }>;
};

async function searchByPoNumber(
  poNumber: string,
): Promise<{ invoiceId: string; invoiceNumber: string } | null> {
  let res: Response;
  try {
    res = await zohoFetch(
      `/books/v3/invoices?purchaseorder_number=${encodeURIComponent(poNumber)}`,
    );
  } catch {
    return null;
  }

  if (!res.ok) return null;

  const json = (await res.json()) as ZohoInvoiceListResponse;
  const invoice = json.invoices?.[0];
  if (!invoice?.invoice_id) return null;

  return { invoiceId: invoice.invoice_id, invoiceNumber: invoice.invoice_number };
}

/**
 * Find the Zoho Books invoice for a Shopify order number and return its PDF bytes.
 *
 * Tries MOVE-{number} and GCC-{number} in parallel, takes the first hit.
 */
export async function fetchInvoiceForOrder(orderNumber: string): Promise<InvoiceResult> {
  const stripped = orderNumber.trim().replace(/^#/, "");

  // Try all known PO prefixes in parallel.
  const candidates = PO_PREFIXES.map((prefix) => `${prefix}-${stripped}`);
  const results = await Promise.all(candidates.map(searchByPoNumber));
  const match = results.find((r) => r !== null) ?? null;

  if (!match) {
    return {
      ok: false,
      error: `No Zoho Books invoice found for order ${orderNumber}. It may not have been invoiced yet.`,
      reason: "not_found",
    };
  }

  // Fetch the PDF bytes.
  let pdfRes: Response;
  try {
    pdfRes = await zohoFetch(`/books/v3/invoices/${match.invoiceId}?accept=pdf`, {
      headers: { Accept: "application/pdf" },
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Zoho PDF request failed",
      reason: "zoho_error",
    };
  }

  if (!pdfRes.ok) {
    return {
      ok: false,
      error: `Zoho returned ${pdfRes.status} fetching invoice PDF`,
      reason: "zoho_error",
    };
  }

  const contentType = pdfRes.headers.get("content-type") ?? "";
  if (!contentType.includes("pdf")) {
    // Zoho may return JSON error even on 200 for some edge cases.
    const text = await pdfRes.text();
    return {
      ok: false,
      error: `Zoho returned unexpected content type (${contentType}): ${text.slice(0, 200)}`,
      reason: "zoho_error",
    };
  }

  const pdfBytes = await pdfRes.arrayBuffer();
  return { ok: true, pdfBytes, invoiceNumber: match.invoiceNumber };
}
