-- 009_stock_restock_log.sql
-- Audit log + idempotency for stock balance restock (Shopify on_hand ← Ubex).

create table if not exists stock_restock_log (
  id uuid primary key default gen_random_uuid(),
  ubex_id text not null,
  barcode text not null,
  shopify_inventory_item_id text not null,
  location_id bigint not null,
  ubex_qty int not null,
  previous_on_hand int,
  new_on_hand int,
  committed int,
  status text not null check (status in ('success', 'error', 'skipped')),
  error text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists stock_restock_log_created_idx
  on stock_restock_log (created_at desc);

create index if not exists stock_restock_log_barcode_idx
  on stock_restock_log (barcode);

alter table stock_restock_log enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'stock_restock_log' and policyname = 'service_role_all'
  ) then
    create policy service_role_all on stock_restock_log
      for all to service_role using (true) with check (true);
  end if;
end $$;

create table if not exists stock_restock_idempotency (
  key text primary key,
  barcode text not null,
  location_id bigint not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

alter table stock_restock_idempotency enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'stock_restock_idempotency' and policyname = 'service_role_all'
  ) then
    create policy service_role_all on stock_restock_idempotency
      for all to service_role using (true) with check (true);
  end if;
end $$;
