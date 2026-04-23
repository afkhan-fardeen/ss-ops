-- order_ubex_links: stores the resolved match between a Shopify order and its Ubex tracking ID.
-- Populated by the portal when the COD list / fulfillment pages build their Ubex lookup.
-- Consumed by the auto-sync cron (POST /api/sync/auto-fulfill) to detect when Ubex marks
-- a shipment as "Order Fulfilled" and then push the fulfillment + tracking link to Shopify.

create table if not exists order_ubex_links (
  shopify_order_id    bigint       primary key,
  shopify_order_name  text         not null,
  ubex_tracking       text         not null,
  last_ubex_status    text,
  auto_fulfilled_at   timestamptz,
  created_at          timestamptz  not null default now(),
  updated_at          timestamptz  not null default now()
);

-- Fast lookup by tracking id (cron iterates by order but useful for debugging).
create index if not exists order_ubex_links_tracking_idx
  on order_ubex_links (ubex_tracking);

-- Partial index: only un-fulfilled rows so the cron query stays O(pending) not O(all).
create index if not exists order_ubex_links_pending_idx
  on order_ubex_links (shopify_order_id)
  where auto_fulfilled_at is null;

-- RLS: service role can do everything; anon/authenticated cannot.
alter table order_ubex_links enable row level security;

drop policy if exists "service_role_all" on order_ubex_links;
create policy "service_role_all"
  on order_ubex_links
  for all
  to service_role
  using (true)
  with check (true);
