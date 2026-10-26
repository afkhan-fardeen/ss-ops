-- 020_merge_stock_modules.sql
-- Stock analysis, Ubex Inventory and Stock Alerts were merged into the single "stock" module.
-- Rewrite per-user grants so nobody loses (or silently gains) access. Idempotent.
-- (The app also treats the legacy ids as granting "stock" at runtime, so applying this is optional but tidy.)
update profiles
set allowed_modules = (
  select coalesce(array_agg(distinct m), '{}')
  from unnest(
    array_remove(array_remove(array_remove(allowed_modules, 'stockAnalysis'), 'ubexInventory'), 'stockAlerts')
    || case
         when allowed_modules && array['stockAnalysis','ubexInventory','stockAlerts'] then array['stock']
         else '{}'::text[]
       end
  ) as m
)
where allowed_modules is not null
  and allowed_modules && array['stockAnalysis','ubexInventory','stockAlerts'];
