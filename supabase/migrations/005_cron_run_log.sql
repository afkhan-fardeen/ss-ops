-- cron_run_log: one row per auto-fulfill cron execution.
-- Written by the auto-fulfill route at start (status='running') and
-- updated at end (status='success'|'error'). Read by the portal status panel.

create table if not exists cron_run_log (
  id            bigint        generated always as identity primary key,
  endpoint      text          not null default '/api/sync/auto-fulfill',
  dry_run       boolean       not null default false,
  status        text          not null,   -- 'running' | 'success' | 'error'
  checked       int,
  fulfilled     int,
  skipped       int,
  errors        int,
  error_detail  text,
  started_at    timestamptz   not null default now(),
  completed_at  timestamptz
);

-- Only keep the latest 500 rows to avoid unbounded growth.
create index if not exists cron_run_log_started_at_idx on cron_run_log (started_at desc);

alter table cron_run_log enable row level security;

drop policy if exists "service_role_all" on cron_run_log;
create policy "service_role_all"
  on cron_run_log for all to service_role
  using (true) with check (true);
