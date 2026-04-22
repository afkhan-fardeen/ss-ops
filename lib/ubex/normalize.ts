/** Normalize order / shipment reference for case-insensitive matching (Shopify ↔ Ubex). */
export function normalizeOrderRef(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^#+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Return the trailing n digits of any string (strips non-digits). Empty if fewer than n digits. */
export function lastDigits(raw: string, n = 4): string {
  if (!raw) return "";
  const digits = raw.replace(/\D+/g, "");
  if (digits.length < n) return "";
  return digits.slice(-n);
}
