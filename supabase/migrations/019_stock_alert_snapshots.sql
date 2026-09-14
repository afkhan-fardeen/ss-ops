-- 019_stock_alert_snapshots.sql
-- Point-in-time low-stock/stockout counts captured when a human runs the
-- Stock Alerts scan. Mirrors stock_mismatch_snapshots so the dashboard tile
-- can show a recent count without re-running the full catalog scan.

create table if not exists stock_alert_snapshots (
  id uuid primary key default gen_random_uuid(),
  captured_at timestamptz not null default now(),
  captured_by uuid,
  critical_count int not null,
  warning_count int not null,
  critical_products jsonb not null default '[]'::jsonb
);

create index if not exists stock_alert_snapshots_captured_idx
  on stock_alert_snapshots (captured_at desc);

alter table stock_alert_snapshots enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'stock_alert_snapshots' and policyname = 'service_role_all'
  ) then
    create policy service_role_all on stock_alert_snapshots
      for all to service_role using (true) with check (true);
  end if;
end $$;
