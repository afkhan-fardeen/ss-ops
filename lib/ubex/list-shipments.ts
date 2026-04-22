import { ubexFetch } from "./client";
import { ubexJsonStatusOk } from "./http-status";

export type UbexListShipmentRow = {
  tracking?: string;
  [key: string]: unknown;
};

/**
 * The v2 list endpoint returns a flat array: { data: Row[], count, status, msg }.
 * Legacy `/api/shipments/list` (no v2) now 500s on most accounts; v2 is the replacement.
 */
type V2ListResponse = {
  status?: number | string;
  msg?: string;
  count?: number;
  data?: UbexListShipmentRow[];
};

export type UbexListPage = {
  rows: UbexListShipmentRow[];
  /** Ubex sometimes returns 200 + informational message (e.g. "API disabled"). */
  apiMessage?: string;
};

function msgLooksDisabled(msg: string | undefined): boolean {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return m.includes("api disabled") || m.includes("contact administrator");
}

/** One list page (50 rows per Ubex v2). */
export async function fetchShipmentListPage(page: number): Promise<UbexListPage> {
  const res = await ubexFetch(`/api/v2/shipments/list?page=${page}`);
  const json = (await res.json()) as V2ListResponse;
  if (!res.ok) {
    throw new Error(`Ubex list HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  }
  if (!ubexJsonStatusOk(json.status)) {
    throw new Error(`Ubex list error: ${json.msg ?? JSON.stringify(json).slice(0, 200)}`);
  }
  const rows = (json.data ?? []).filter((r) => r && typeof r === "object");
  const apiMessage = rows.length === 0 && msgLooksDisabled(json.msg) ? json.msg : undefined;
  return { rows, apiMessage };
}

/** Default v2 list page size is 50; we infer last page when we get fewer than this. */
export const UBEX_LIST_PAGE_SIZE = 50;
