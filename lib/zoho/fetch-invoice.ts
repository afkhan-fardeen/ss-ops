import { zohoFetch } from "./client";

export type InvoiceResult =
  | { ok: true; pdfBytes: ArrayBuffer; invoiceNumber: string }
  | { ok: false; error: string; reason: "not_found" | "zoho_error" };

/** PO number prefixes used in Zoho Books (e.g. MOVE-252641, GCC-SS1011). */
const PO_PREFIXES = ["MOVE", "GCC"] as const;
const PREFIXED_PO = /^(MOVE|GCC)-/i;

type ZohoInvoiceRow = {
  invoice_id: string;
  invoice_number: string;
  reference_number?: string;
};

type ZohoInvoiceListResponse = {
  code?: number;
  message?: string;
  invoices?: ZohoInvoiceRow[];
};

function normalizePo(raw: string): string {
  return raw.trim().replace(/^#+/, "").toLowerCase();
}

function pickVerifiedInvoice(
  invoices: ZohoInvoiceRow[] | undefined,
  poNumber: string,
): { invoiceId: string; invoiceNumber: string } | null {
  const want = normalizePo(poNumber);
  if (!want || !invoices?.length) return null;

  for (const invoice of invoices) {
    if (!invoice.invoice_id) continue;
    if (normalizePo(invoice.reference_number ?? "") !== want) continue;
    return { invoiceId: invoice.invoice_id, invoiceNumber: invoice.invoice_number };
  }
  return null;
}

async function listInvoicesByQuery(
  param: "reference_number" | "search_text",
  value: string,
): Promise<ZohoInvoiceRow[] | null> {
  let res: Response;
  try {
    res = await zohoFetch(
      `/books/v3/invoices?${param}=${encodeURIComponent(value)}`,
    );
  } catch {
    return null;
  }

  if (!res.ok) return null;

  const json = (await res.json()) as ZohoInvoiceListResponse;
  return json.invoices ?? [];
}

/**
 * Find an invoice whose reference_number (PO) matches the order id exactly.
 * Tries reference_number filter first, then search_text — never returns an unverified row.
 */
async function searchByPoNumber(
  poNumber: string,
): Promise<{ invoiceId: string; invoiceNumber: string } | null> {
  const byRef = await listInvoicesByQuery("reference_number", poNumber);
  const verified = pickVerifiedInvoice(byRef ?? undefined, poNumber);
  if (verified) return verified;

  // Fallback: broader search, still require exact reference_number match.
  const byText = await listInvoicesByQuery("search_text", poNumber);
  return pickVerifiedInvoice(byText ?? undefined, poNumber);
}

function poCandidates(stripped: string): string[] {
  // Staff usually paste the full PO (MOVE-252659 / GCC-SS1011) — search that exact string once.
  if (PREFIXED_PO.test(stripped)) {
    return [stripped];
  }
  return PO_PREFIXES.map((prefix) => `${prefix}-${stripped}`);
}

/**
 * Find the Zoho Books invoice for a Shopify order number and return its PDF bytes.
 *
 * PO = order id, stored on the invoice as reference_number.
 * Uses the full PO when the input already has a MOVE-/GCC- prefix;
 * otherwise tries MOVE-{n} and GCC-{n} in parallel.
 */
export async function fetchInvoiceForOrder(orderNumber: string): Promise<InvoiceResult> {
  const stripped = orderNumber.trim().replace(/^#/, "");
  const candidates = poCandidates(stripped);

  const results = await Promise.all(candidates.map(searchByPoNumber));
  const match = results.find((r) => r !== null) ?? null;

  if (!match) {
    return {
      ok: false,
      error: `No Zoho Books invoice found with PO/reference ${candidates.join(" or ")}. It may not have been invoiced yet.`,
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
