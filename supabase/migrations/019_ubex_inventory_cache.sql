-- 019_ubex_inventory_cache.sql
-- Snapshot of Ubex inventory catalog for Barcode Compare (keyed by barcode, not SKU).

create table if not exists ubex_inventory_cache (
  barcode text primary key,
  ubex_id text not null,
  sku text not null default '',
  name text not null default '',
  size text,
  color text,
  stock int not null default 0,
  refreshed_at timestamptz not null default now()
);

create index if not exists ubex_inventory_cache_refreshed_idx
  on ubex_inventory_cache (refreshed_at desc);

alter table ubex_inventory_cache enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'ubex_inventory_cache' and policyname = 'service_role_all'
  ) then
    create policy service_role_all on ubex_inventory_cache
      for all to service_role using (true) with check (true);
  end if;
end $$;
