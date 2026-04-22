export type ShopifyAddress = {
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  country_code?: string | null;
  zip?: string | null;
};

export type ShopifyCustomer = {
  first_name?: string | null;
  last_name?: string | null;
};

export type ShopifyOrder = {
  id: number;
  name: string;
  /** Numeric order number (without #); useful matching Ubex shipment_reference. */
  order_number?: number | null;
  total_price: string;
  currency: string;
  financial_status?: string | null;
  gateway?: string | null;
  payment_gateway_names?: string[];
  fulfillment_status?: string | null;
  customer?: ShopifyCustomer | null;
  shipping_address?: ShopifyAddress | null;
};

export type ShopifyOrdersResponse = { orders: ShopifyOrder[] };
