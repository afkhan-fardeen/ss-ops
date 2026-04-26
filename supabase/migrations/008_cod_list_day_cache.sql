-- Per–close-day snapshot of window-filtered COD orders for the COD list.
-- Skips live Shopify fetches for past (non-today) windows when fresh; writes use service role only.

create table if not exists cod_list_day_cache (
  date_key        text primary key,
  orders_json     jsonb not null,
  fetched_at      timestamptz not null,
  schema_version  int not null default 1
);

create index if not exists cod_list_day_cache_fetched_at_idx
  on cod_list_day_cache (fetched_at desc);

alter table cod_list_day_cache enable row level security;

drop policy if exists cod_list_day_cache_service on cod_list_day_cache;
create policy cod_list_day_cache_service on cod_list_day_cache
  for all to service_role using (true) with check (true);
