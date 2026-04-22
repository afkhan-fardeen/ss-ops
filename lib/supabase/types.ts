/**
 * Hand-maintained DB types for the portal. Regenerate with `supabase gen types typescript` once the CLI
 * is wired up; until then this file is the source of truth for Supabase table shapes.
 */

export type FulfillmentLogStatus = "success" | "error";

export type FulfillmentLogRow = {
  id: string;
  shopify_order_id: number;
  shopify_order_name: string;
  ubex_tracking: string | null;
  tracking_url: string | null;
  tracking_company: string | null;
  status: FulfillmentLogStatus;
  shopify_fulfillment_id: number | null;
  error: string | null;
  request_payload: unknown | null;
  response_payload: unknown | null;
  created_by: string | null;
  created_at: string;
};

export type FxRateSnapshotRow = {
  date: string; // YYYY-MM-DD
  base: string;
  rates: Record<string, number>;
  source: string;
  created_at: string;
};

export type UbexCacheRow = {
  tracking: string;
  sender_barcode: string | null;
  tracking_url: string | null;
  last4: string | null;
  refreshed_at: string;
};

export type PushIdempotencyRow = {
  key: string;
  shopify_order_id: number;
  created_by: string | null;
  created_at: string;
};

export type ShopifyOrderCacheRow = {
  id: number;
  name: string;
  order_number: number | null;
  created_at: string | null;
  financial_status: string | null;
  fulfillment_status: string | null;
  gateway: string | null;
  payment_gateway_names: string[] | null;
  total_price: number | string | null;
  currency: string | null;
  country_code: string | null;
  customer: unknown;
  shipping_address: unknown;
  is_cod: boolean | null;
  raw: unknown;
  last_synced_at: string;
};

export type Database = {
  public: {
    Tables: {
      fulfillment_log: {
        Row: FulfillmentLogRow;
        Insert: Omit<FulfillmentLogRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<FulfillmentLogRow>;
      };
      fx_rate_snapshot: {
        Row: FxRateSnapshotRow;
        Insert: Omit<FxRateSnapshotRow, "created_at"> & { created_at?: string };
        Update: Partial<FxRateSnapshotRow>;
      };
      ubex_cache: {
        Row: UbexCacheRow;
        Insert: Omit<UbexCacheRow, "refreshed_at" | "last4"> & { refreshed_at?: string };
        Update: Partial<UbexCacheRow>;
      };
      push_idempotency: {
        Row: PushIdempotencyRow;
        Insert: Omit<PushIdempotencyRow, "created_at"> & { created_at?: string };
        Update: Partial<PushIdempotencyRow>;
      };
      shopify_orders_cache: {
        Row: ShopifyOrderCacheRow;
        Insert: Omit<ShopifyOrderCacheRow, "last_synced_at"> & { last_synced_at?: string };
        Update: Partial<ShopifyOrderCacheRow>;
      };
      /** Legacy FX cache table from the earliest Supabase wiring. Kept for back-compat. */
      fx_rates_cache: {
        Row: {
          id: string;
          payload: Record<string, number>;
          fetched_at: string;
          source: string;
        };
        Insert: {
          id: string;
          payload: Record<string, number>;
          fetched_at: string;
          source: string;
        };
        Update: Partial<{
          id: string;
          payload: Record<string, number>;
          fetched_at: string;
          source: string;
        }>;
      };
    };
  };
};
