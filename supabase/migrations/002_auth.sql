-- 002_auth.sql
-- Phase C: Supabase Auth migration. Adds a `profiles` table mirroring `auth.users`, links
-- fulfillment_log.created_by to it, and turns on RLS so the portal only sees its own rows.

-- 1) Profiles -----------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'member' check (role in ('admin','member','viewer')),
  created_at timestamptz not null default now()
);
create index if not exists profiles_email_idx on profiles (email);

-- Trigger: auto-create a profile row every time a new auth.users row is inserted.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 2) Foreign-key from fulfillment_log.created_by --> profiles.id -------------
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'fulfillment_log_created_by_fkey'
  ) then
    alter table fulfillment_log
      add constraint fulfillment_log_created_by_fkey
      foreign key (created_by) references profiles(id) on delete set null;
  end if;
end$$;

-- 3) RLS ---------------------------------------------------------------------
alter table profiles enable row level security;
alter table fulfillment_log enable row level security;
alter table fx_rate_snapshot enable row level security;
alter table ubex_cache enable row level security;
alter table push_idempotency enable row level security;

-- Everyone authenticated can read their own profile; admins can read all.
drop policy if exists profiles_self_read on profiles;
create policy profiles_self_read on profiles
  for select to authenticated
  using (id = auth.uid()
         or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Portal tables: any authenticated member/admin can read/write; viewers read-only.
drop policy if exists fulfillment_log_read on fulfillment_log;
create policy fulfillment_log_read on fulfillment_log
  for select to authenticated using (true);

drop policy if exists fulfillment_log_write on fulfillment_log;
create policy fulfillment_log_write on fulfillment_log
  for insert to authenticated
  with check (exists (
    select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','member')
  ));

drop policy if exists fx_rate_snapshot_read on fx_rate_snapshot;
create policy fx_rate_snapshot_read on fx_rate_snapshot
  for select to authenticated using (true);

drop policy if exists ubex_cache_read on ubex_cache;
create policy ubex_cache_read on ubex_cache
  for select to authenticated using (true);

drop policy if exists push_idempotency_read on push_idempotency;
create policy push_idempotency_read on push_idempotency
  for select to authenticated using (true);

-- NOTE: the service-role client bypasses RLS and is what the Ops Portal server uses to write.
