export type UbexLookup = {
  /** Normalized ref → tracking id (full-string match). */
  refToTracking: Map<string, string>;
  /** Last-4 digits → tracking id (single hit). If a last-4 maps to multiple trackings, it is removed. */
  last4ToTracking: Map<string, string>;
  /** Last-4 digits that had collisions (ambiguous). */
  last4Conflicts: Set<string>;
  /** Tracking id → tracking URL (as returned by Ubex details `tracking_url`). */
  trackingUrls: Map<string, string>;
  /** Total unique Ubex shipments seen. */
  totalShipments: number;
  /** Informational message from Ubex (e.g. "API disabled. Contact administrator for support."). */
  apiMessage?: string;
  /** Error surfaced from list/details calls (network, auth, etc.). */
  error?: string;
};

export type BuildUbexLookupOptions = {
  /** Shopify order last-4 digits we want to resolve. Lets the builder short-circuit once all are matched. */
  needed?: Set<string>;
  /** Bypass the module-level TTL cache. */
  force?: boolean;
  /**
   * COD list only: if true, skip shipment `details` fetches when `needed` is fully matched after
   * the list pages; if still unmatched, use a lower detail cap. Fulfillment should leave this off.
   */
  skipDetailFetches?: boolean;
};
