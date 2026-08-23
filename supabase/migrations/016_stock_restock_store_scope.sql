-- 016_stock_restock_store_scope.sql
-- Scope restock audit/idempotency rows to Store A (1) or Store B (2).

alter table public.stock_restock_log
  add column if not exists store_id smallint not null default 1;

create index if not exists stock_restock_log_store_idx
  on public.stock_restock_log (store_id, created_at desc);

alter table public.stock_restock_idempotency
  add column if not exists store_id smallint not null default 1;
