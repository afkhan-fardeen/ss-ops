-- 018_order_line_items.sql
-- Normalized Shopify line items for sales aggregates + commitment snapshot columns.

create table if not exists order_line_items (
  id bigint generated always as identity primary key,
  store_id smallint not null default 1,
  shopify_order_id bigint not null,
  shopify_order_name text not null,
  line_item_id bigint not null,
  product_id bigint,
  variant_id bigint,
  sku text,
  barcode text,
  title text not null,
  variant_title text,
  quantity int not null,
  price numeric,
  order_created_at timestamptz not null,
  synced_at timestamptz not null default now(),
  unique (store_id, shopify_order_id, line_item_id)
);

create index if not exists order_line_items_barcode_idx
  on order_line_items (barcode);

create index if not exists order_line_items_sku_idx
  on order_line_items (sku);

create index if not exists order_line_items_created_idx
  on order_line_items (order_created_at desc);

create index if not exists order_line_items_store_created_idx
  on order_line_items (store_id, order_created_at desc);

alter table order_line_items enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'order_line_items' and policyname = 'service_role_all'
  ) then
    create policy service_role_all on order_line_items
      for all to service_role using (true) with check (true);
  end if;
end $$;

-- Extend mismatch snapshots with commitment KPIs captured on sweep.
alter table stock_mismatch_snapshots
  add column if not exists total_committed int,
  add column if not exists can_be_sent int,
  add column if not exists products_short int,
  add column if not exists short_products jsonb not null default '[]'::jsonb;
