import { resolveTrackingUrl } from "@/lib/ubex/tracking-url";

export type RowWithUbexFields = {
  orderId: number;
  ubexId: string;
  trackingUrl: string;
};

/**
 * Fill missing Ubex ids from persisted order_ubex_links. Live lookup values are never overwritten.
 */
export function applyStoredUbexLinks<T extends RowWithUbexFields>(
  rows: T[],
  storedByOrderId: Map<number, string>,
): T[] {
  if (storedByOrderId.size === 0) return rows;

  return rows.map((row) => {
    if (row.ubexId.trim()) return row;
    const tracking = storedByOrderId.get(row.orderId)?.trim();
    if (!tracking) return row;
    return {
      ...row,
      ubexId: tracking,
      trackingUrl: resolveTrackingUrl(tracking, ""),
    };
  });
}
