/** Numeric Zoho Books customfield_id for "Ubex Barcode" — discover via scripts/zoho-discover-barcode-field.ts */
export function getUbexBarcodeFieldId(): string | null {
  const id = process.env.ZOHO_UBEX_BARCODE_CF_ID?.trim();
  return id || null;
}

export function requireUbexBarcodeFieldId(): string {
  const id = getUbexBarcodeFieldId();
  if (!id) {
    throw new Error("ZOHO_UBEX_BARCODE_CF_ID is not set");
  }
  return id;
}

export type ZohoItemCustomField = {
  customfield_id?: string;
  field_id?: string;
  api_name?: string;
  value?: string | null;
  label?: string;
};

function fieldIdMatches(
  field: ZohoItemCustomField,
  targetFieldId: string,
): boolean {
  const id = targetFieldId.trim();
  return field.customfield_id === id || field.field_id === id;
}

/** Read Ubex Barcode value from a Zoho item row. Empty/missing entry returns "". */
export function readUbexBarcodeFromItem(
  customFields: ZohoItemCustomField[] | undefined,
  fieldId: string,
): string {
  if (!customFields?.length) return "";
  const hit = customFields.find((f) => fieldIdMatches(f, fieldId));
  const val = hit?.value;
  if (val == null) return "";
  return String(val).trim();
}

/** True when the item has no usable barcode in the Ubex Barcode field (absent or empty). */
export function isUbexBarcodeMissingOnItem(
  customFields: ZohoItemCustomField[] | undefined,
  fieldId: string,
): boolean {
  return readUbexBarcodeFromItem(customFields, fieldId).length === 0;
}

export function resolveFieldDefinitionId(field: {
  customfield_id?: string;
  field_id?: string;
}): string | null {
  const id = field.customfield_id ?? field.field_id;
  return id?.trim() || null;
}
