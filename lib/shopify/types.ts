type ShopifyAddress = {
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  country_code?: string | null;
  zip?: string | null;
};

type ShopifyCustomer = {
  first_name?: string | null;
  last_name?: string | null;
};

export type ShopifyLineItem = {
  id: number;
  product_id?: number | null;
  variant_id?: number | null;
  sku?: string | null;
  barcode?: string | null;
  title: string;
  variant_title?: string | null;
  quantity: number;
  price?: string | null;
};

export type ShopifyOrder = {
  id: number;
  name: string;
  /** Numeric order number (without #); useful matching Ubex shipment_reference. */
  order_number?: number | null;
  total_price: string;
  total_discounts?: string | null;
  currency: string;
  cancelled_at?: string | null;
  financial_status?: string | null;
  /** e.g. "web", "pos", "shopify_draft_order" (staff-created via a draft order), "api". */
  source_name?: string | null;
  gateway?: string | null;
  payment_gateway_names?: string[];
  fulfillment_status?: string | null;
  created_at?: string | null;
  customer?: ShopifyCustomer | null;
  shipping_address?: ShopifyAddress | null;
  line_items?: ShopifyLineItem[];
};

export type ShopifyOrdersResponse = { orders: ShopifyOrder[] };
