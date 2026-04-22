/**
 * Build a Ubex tracking URL from a tracking id.
 * Uses UBEX_TRACKING_URL_TEMPLATE, which may contain {id} as a placeholder.
 * Default: https://ubex.co/tracking/{id}  (public tracking page).
 */
const DEFAULT_TEMPLATE = "https://ubex.co/tracking/{id}";

export function buildTrackingUrl(trackingId: string): string {
  if (!trackingId) return "";
  const template = (process.env.UBEX_TRACKING_URL_TEMPLATE ?? DEFAULT_TEMPLATE).trim() || DEFAULT_TEMPLATE;
  if (template.includes("{id}")) return template.replace("{id}", encodeURIComponent(trackingId));
  return template.endsWith("/") ? `${template}${encodeURIComponent(trackingId)}` : `${template}/${encodeURIComponent(trackingId)}`;
}

/**
 * Prefer Ubex's own `tracking_url` only when it actually embeds the tracking id.
 * Ubex's details response sometimes returns a bare base URL (`https://ubex.co/tracking/`)
 * which is useless — fall back to the template in that case.
 */
export function resolveTrackingUrl(trackingId: string, ubexProvidedUrl?: string | null): string {
  const id = trackingId.trim();
  if (!id) return "";
  const provided = (ubexProvidedUrl ?? "").trim();
  if (provided && provided.includes(id)) return provided;
  return buildTrackingUrl(id);
}
