-- Employee vs Business subscription classification.
-- Default employee so existing rows backfill correctly.

alter table public.subscription_requests
  add column if not exists subscription_type text not null default 'employee';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subscription_requests_subscription_type_check'
  ) then
    alter table public.subscription_requests
      add constraint subscription_requests_subscription_type_check
      check (subscription_type in ('employee', 'business'));
  end if;
end $$;

create index if not exists subscription_requests_type_idx
  on public.subscription_requests (subscription_type);
