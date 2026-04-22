-- 003_orders_cache.sql
-- Phase D: cache Shopify orders locally so /cod-list and /fulfillment don't hit the Shopify API
-- on every page load. Webhook topics (orders/fulfillments) keep the cache fresh in near real-time.

create table if not exists shopify_orders_cache (
  id bigint primary key,                 -- shopify order id
  name text not null,
  order_number int,
  created_at timestamptz,
  financial_status text,
  fulfillment_status text,
  gateway text,
  payment_gateway_names text[],
  total_price numeric,
  currency text,
  country_code text,
  customer jsonb,
  shipping_address jsonb,
  is_cod boolean,
  raw jsonb,                              -- last full payload (for debugging)
  last_synced_at timestamptz not null default now()
);

create index if not exists shopify_orders_cache_created_idx
  on shopify_orders_cache (created_at desc);

create index if not exists shopify_orders_cache_unfulfilled_idx
  on shopify_orders_cache (fulfillment_status)
  where fulfillment_status is distinct from 'fulfilled';

create index if not exists shopify_orders_cache_is_cod_idx
  on shopify_orders_cache (is_cod)
  where is_cod;

alter table shopify_orders_cache enable row level security;

drop policy if exists shopify_orders_cache_read on shopify_orders_cache;
create policy shopify_orders_cache_read on shopify_orders_cache
  for select to authenticated using (true);

-- Writes go through service role (webhook handlers / backfill).
