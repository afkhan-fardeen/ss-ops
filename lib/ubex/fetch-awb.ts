import { ubexFetch } from "./client";
import { ubexJsonStatusOk } from "./http-status";

export type AwbResult =
  | { ok: true; pdfUrl: string }
  | { ok: false; error: string };

export async function fetchAwb(tracking: string): Promise<AwbResult> {
  const safe = encodeURIComponent(tracking);
  let res: Response;
  try {
    res = await ubexFetch(`/api/shipments/awb/${safe}?paper=A4&orientation=portrait`);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "UBEX request failed",
    };
  }

  let json: { status?: unknown; pdf?: unknown; error?: string };
  try {
    json = (await res.json()) as typeof json;
  } catch {
    return { ok: false, error: `UBEX AWB ${res.status}: invalid JSON response` };
  }

  if (!res.ok || !ubexJsonStatusOk(json.status)) {
    return { ok: false, error: json.error ?? `UBEX AWB ${res.status}` };
  }

  if (!json.pdf || typeof json.pdf !== "string") {
    return { ok: false, error: "UBEX returned no PDF link" };
  }

  return { ok: true, pdfUrl: json.pdf };
}
