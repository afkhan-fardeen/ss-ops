-- 023_lock_down_data_access.sql
-- Security hardening. The portal reads/writes ALL data from the server with the service-role key; the browser
-- only uses Supabase for sign-in. So nothing in `public` should be reachable with the public anon key or by a
-- merely signed-in user. Fixes found in the audit:
--   1. RLS was OFF on subscription_requests, portal_login_log, fx_rates_cache -> readable AND writable by anyone
--      holding the (public) anon key.
--   2. profiles_self_update let any signed-in user change their own `role` / `allowed_modules` (self-promotion to admin).
--   3. Blanket "any authenticated user can read" policies on operational tables.
--   4. anon had INSERT/UPDATE/DELETE grants on public tables.
-- The service_role key bypasses RLS, so the app is unaffected. Idempotent.

-- 1) RLS on every table + explicit service-role policy
do $$
declare t text;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists service_role_all on public.%I', t);
    execute format('create policy service_role_all on public.%I for all to service_role using (true) with check (true)', t);
  end loop;
end$$;

-- 2) A signed-in user must never be able to edit their own role/modules (admins do this server-side)
drop policy if exists profiles_self_update on public.profiles;
revoke update on public.profiles from authenticated;

-- 3) Remove "any signed-in user may read/write" policies on operational data
drop policy if exists fulfillment_log_read on public.fulfillment_log;
drop policy if exists fulfillment_log_write on public.fulfillment_log;
drop policy if exists fx_rate_snapshot_read on public.fx_rate_snapshot;
drop policy if exists push_idempotency_read on public.push_idempotency;
drop policy if exists shopify_orders_cache_read on public.shopify_orders_cache;
drop policy if exists ubex_cache_read on public.ubex_cache;
-- (profiles_self_read stays: a user may read their own profile; admins read all.)

-- 4) The anon role gets nothing in public, now or for future tables
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;
