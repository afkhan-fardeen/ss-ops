-- 024_retention.sql
-- Keep the free-tier database small and fast: prune rows that are never read again.
-- Runs daily via pg_cron. Retention windows are deliberately generous.
--   cron_run_log                 90 days   (the table comment always said "keep recent"; it had 17k rows)
--   push_idempotency / stock_restock_idempotency   14 days (keys include the UTC date, so older keys can never match)
--   portal_login_log             1 year
--   stock_mismatch_snapshots / stock_alert_snapshots   1 year
--   shopify_orders_cache(_s2)    120 days  (cache only; live data is re-fetched on demand)
-- Also closes cron runs that were left "running" (function timed out before completing).
-- fulfillment_log, stock_restock_log, order_line_items and subscription_requests are audit/analysis data: kept.

create or replace function public.prune_old_rows()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n_stale int; n_cron int; n_idem1 int; n_idem2 int; n_login int; n_snap1 int; n_snap2 int; n_c1 int; n_c2 int;
begin
  update cron_run_log
     set status = 'error', completed_at = coalesce(completed_at, now())
   where status = 'running' and started_at < now() - interval '1 hour';
  get diagnostics n_stale = row_count;

  delete from cron_run_log where started_at < now() - interval '90 days';
  get diagnostics n_cron = row_count;
  delete from push_idempotency where created_at < now() - interval '14 days';
  get diagnostics n_idem1 = row_count;
  delete from stock_restock_idempotency where created_at < now() - interval '14 days';
  get diagnostics n_idem2 = row_count;
  delete from portal_login_log where logged_in_at < now() - interval '1 year';
  get diagnostics n_login = row_count;
  delete from stock_mismatch_snapshots where captured_at < now() - interval '1 year';
  get diagnostics n_snap1 = row_count;
  delete from stock_alert_snapshots where captured_at < now() - interval '1 year';
  get diagnostics n_snap2 = row_count;
  delete from shopify_orders_cache where created_at < now() - interval '120 days';
  get diagnostics n_c1 = row_count;
  delete from shopify_orders_cache_s2 where created_at < now() - interval '120 days';
  get diagnostics n_c2 = row_count;

  return jsonb_build_object(
    'stale_cron_closed', n_stale, 'cron_run_log', n_cron, 'push_idempotency', n_idem1,
    'stock_restock_idempotency', n_idem2, 'portal_login_log', n_login,
    'stock_mismatch_snapshots', n_snap1, 'stock_alert_snapshots', n_snap2,
    'shopify_orders_cache', n_c1, 'shopify_orders_cache_s2', n_c2
  );
end;
$$;

revoke all on function public.prune_old_rows() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.unschedule('prune-old-rows') where exists (select 1 from cron.job where jobname = 'prune-old-rows');
select cron.schedule('prune-old-rows', '17 3 * * *', $job$select public.prune_old_rows()$job$);
