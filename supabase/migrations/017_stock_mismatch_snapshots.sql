-- 017_stock_mismatch_snapshots.sql
-- Point-in-time catalog health captured when a human runs "Find all mismatches".

create table if not exists stock_mismatch_snapshots (
  id uuid primary key default gen_random_uuid(),
  captured_at timestamptz not null default now(),
  captured_by uuid,
  total_items int not null,
  matched_count int not null,
  mismatched_count int not null,
  unlinked_count int not null,
  ambiguous_count int not null,
  skipped_count int not null,
  store_comparison jsonb not null default '[]'::jsonb
);

create index if not exists stock_mismatch_snapshots_captured_idx
  on stock_mismatch_snapshots (captured_at desc);

alter table stock_mismatch_snapshots enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'stock_mismatch_snapshots' and policyname = 'service_role_all'
  ) then
    create policy service_role_all on stock_mismatch_snapshots
      for all to service_role using (true) with check (true);
  end if;
end $$;
