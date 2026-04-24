-- ────────────────────────────────────────────────────────────
-- 007_cod_email_log.sql
-- Tracks every COD-list email that was sent via the portal.
-- ────────────────────────────────────────────────────────────

create table if not exists cod_email_log (
  id             uuid        primary key default gen_random_uuid(),
  sent_at        timestamptz not null default now(),
  sent_by_email  text,
  window_start   timestamptz not null,
  window_end     timestamptz not null,
  recipients     text        not null default '',
  order_count    int         not null default 0,
  status         text        not null default 'success',
  error          text
);

alter table cod_email_log enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'cod_email_log' and policyname = 'service_role_all'
  ) then
    create policy service_role_all on cod_email_log
      for all to service_role using (true) with check (true);
  end if;
end $$;

-- Index for fast recent-log queries
create index if not exists cod_email_log_sent_at_idx on cod_email_log (sent_at desc);
