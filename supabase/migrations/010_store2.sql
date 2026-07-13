-- 010_store2.sql
-- Add store_id discriminator to shared tables so Store 2 (COD + fulfillment)
-- can share the same Supabase project. Existing rows default to store_id = 1.
-- Safe to re-run: all DDL uses IF NOT EXISTS / IF EXISTS guards.

-- 1) Scope fulfillment_log by store ----------------------------------------
alter table fulfillment_log
  add column if not exists store_id smallint not null default 1;

create index if not exists fulfillment_log_store_idx
  on fulfillment_log (store_id, created_at desc);

-- 2) Scope push_idempotency by store ----------------------------------------
alter table push_idempotency
  add column if not exists store_id smallint not null default 1;

-- 3) Scope order_ubex_links by store -----------------------------------------
alter table order_ubex_links
  add column if not exists store_id smallint not null default 1;

-- Replace the existing partial index with a store-aware one.
drop index if exists order_ubex_links_pending_idx;
create index if not exists order_ubex_links_store_pending_idx
  on order_ubex_links (store_id, shopify_order_id)
  where auto_fulfilled_at is null;

-- 4) Separate order cache for Store 2 ----------------------------------------
-- Distinct table (not a store_id column) avoids primary-key collisions when
-- both stores happen to share the same Shopify order-id integer space.
create table if not exists shopify_orders_cache_s2 (
  id                  bigint       primary key,
  name                text         not null,
  order_number        int,
  created_at          timestamptz,
  financial_status    text,
  fulfillment_status  text,
  gateway             text,
  payment_gateway_names text[],
  total_price         numeric,
  currency            text,
  country_code        text,
  customer            jsonb,
  shipping_address    jsonb,
  is_cod              boolean,
  raw                 jsonb,
  last_synced_at      timestamptz  not null default now()
);

create index if not exists shopify_orders_cache_s2_created_idx
  on shopify_orders_cache_s2 (created_at desc);

create index if not exists shopify_orders_cache_s2_unfulfilled_idx
  on shopify_orders_cache_s2 (fulfillment_status)
  where fulfillment_status is distinct from 'fulfilled';

create index if not exists shopify_orders_cache_s2_is_cod_idx
  on shopify_orders_cache_s2 (is_cod)
  where is_cod;

alter table shopify_orders_cache_s2 enable row level security;

drop policy if exists "service_role_all_s2" on shopify_orders_cache_s2;
create policy "service_role_all_s2"
  on shopify_orders_cache_s2
  for all
  to service_role
  using (true)
  with check (true);
