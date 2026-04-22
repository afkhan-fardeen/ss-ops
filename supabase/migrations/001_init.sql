-- 001_init.sql
-- Phase B: core Ops Portal persistence (fulfillment log, FX snapshot, Ubex cache, idempotency).
-- Safe to re-run: everything is guarded with IF NOT EXISTS.

create extension if not exists "pgcrypto";

-- 1) Fulfillment log --------------------------------------------------------
create table if not exists fulfillment_log (
  id uuid primary key default gen_random_uuid(),
  shopify_order_id bigint not null,
  shopify_order_name text not null,
  ubex_tracking text,
  tracking_url text,
  tracking_company text,
  status text not null check (status in ('success','error')),
  shopify_fulfillment_id bigint,
  error text,
  request_payload jsonb,
  response_payload jsonb,
  created_by uuid,                 -- null until Phase C wires Supabase Auth
  created_at timestamptz not null default now()
);
create index if not exists fulfillment_log_order_idx on fulfillment_log (shopify_order_id);
create index if not exists fulfillment_log_created_idx on fulfillment_log (created_at desc);

-- 2) FX rate snapshot -------------------------------------------------------
create table if not exists fx_rate_snapshot (
  date date primary key,
  base text not null default 'GBP',
  rates jsonb not null,
  source text not null,
  created_at timestamptz not null default now()
);

-- 3) Ubex lookup cache ------------------------------------------------------
create table if not exists ubex_cache (
  tracking text primary key,
  sender_barcode text,
  tracking_url text,
  last4 text generated always as (right(coalesce(sender_barcode,''), 4)) stored,
  refreshed_at timestamptz not null default now()
);
create index if not exists ubex_cache_last4_idx on ubex_cache (last4);

-- 4) Push idempotency -------------------------------------------------------
create table if not exists push_idempotency (
  key text primary key,            -- hash(order_id|ubex_tracking|YYYY-MM-DD)
  shopify_order_id bigint not null,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists push_idempotency_order_idx on push_idempotency (shopify_order_id);

-- 5) Legacy FX cache (kept for back-compat with pre-Phase-B deployments) ----
create table if not exists fx_rates_cache (
  id text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null,
  source text not null
);
