# Stock Module — Latest Updates + Stock Analysis Module

**Status:** Planning document — no code written yet.
**Purpose of this file:** everything current in one place —
1. The naming correction across the plans (Ubex is read-only, confirmed)
2. The confirmed production 504 timeout fix
3. The correct Stock Analysis module plan (inventory commitment + sales
   visibility — not the earlier, superseded mismatch/sync-health version)

**Supersedes:** `stock-module-updates-and-analysis-plan.md` in full (that
file's Part B had the wrong Stock Analysis design). Also mirrors — rather
than replaces — content already living in `stock-balance-rebuild-plan.md`
Section 9, `stock-balance-batch-sync-plan.md` Section 4.1, and
`stock-analysis-inventory-sales-plan.md`; those remain the authoritative
versions if this file and any of them ever drift apart during future edits.

---

## Part A — Naming correction across the existing plans

### The concern, addressed directly

**Ubex is never written to, anywhere in any of these plans.** Every sync
action reads Ubex's stock number and writes only to **Shopify**'s
`on_hand` field. No plan, function, or API route calls Ubex's
create/update endpoints. This was true in every prior document — the
confusion comes from a **name**, not a design decision:

Your existing codebase has a real file called `lib/stock/restock-to-ubex.ts`
containing a function called `restockItemToUbex()`. Despite the name, this
function has always written to Shopify, reading from Ubex — confirmed
directly in the code back when this rebuild was first scoped:

> Naming note: consider renaming this file/function while touching it —
> `restock-to-ubex.ts` / `restockItemToUbex()` writes to **Shopify**,
> reading from Ubex. The current name implies the opposite direction.

That note was left as an optional suggestion in the first draft of the
rebuild plan. Given it caused genuine confusion, it's now being treated as
**required**, not optional — the name gets fixed as part of this rebuild,
not left for "later."

### The rename

| Old | New |
|---|---|
| `lib/stock/restock-to-ubex.ts` | `lib/stock/sync-shopify-from-ubex.ts` |
| `restockItemToUbex()` | `syncShopifyFromUbex()` |
| `restockItemsToUbex()` | `syncShopifyFromUbexBulk()` |

Function signatures, parameters, and internal logic are **completely
unchanged** — this is a rename only, everywhere the old names appear.

### Every place this touches across the other three docs

Nothing else in these docs needs to change — only the names below, wherever
they appear:

**`stock-balance-rebuild-plan.md`:**
- Section 4.5 heading: `### 4.5 Dual-write restock — lib/stock/restock-to-ubex.ts`
  → `### 4.5 Dual-write sync — lib/stock/sync-shopify-from-ubex.ts`
- The naming-note paragraph in that section is now resolved — replace it
  with: *"Renamed from `restock-to-ubex.ts` / `restockItemToUbex()` per
  Part A of `stock-module-latest-updates-and-analysis.md`."*
- Section 7 (build order), item 7: `lib/stock/restock-to-ubex.ts` →
  `lib/stock/sync-shopify-from-ubex.ts`

**`stock-balance-errors-page-plan.md`:**
- Section 2, Category B: reference to `lib/stock/restock-to-ubex.ts` →
  `lib/stock/sync-shopify-from-ubex.ts`
- Section 4, "Category-specific action": `restockItemToUbex` →
  `syncShopifyFromUbex`

**`stock-balance-batch-sync-plan.md`:**
- Section 2.3 heading and code block: `restockItemToUbex` /
  `restockItemsToUbex` → `syncShopifyFromUbex` / `syncShopifyFromUbexBulk`
  (both the function signatures shown and the surrounding prose)
- Section 2.4 code block: same two function calls, renamed

**No other content in any of the three docs changes.** The dual-write
logic, batch tracking, error categories, confirm-modal behavior, and
everything else described in those plans is exactly as previously written
— this is purely a find-and-replace of a misleading name, done once, now,
rather than shipped and fixed later.

---

## Part B — Production fix: 504 timeout on `/api/stock-balance/restock`

**Confirmed directly from Vercel runtime logs** (not speculation):

```
POST /api/stock-balance/restock 504
Vercel Runtime Timeout Error: Task timed out after 300 seconds
```

### What this means

The route already declares `export const maxDuration = 300;` and that limit
is being honored — the function ran the full 300 seconds and Vercel killed
it. This is **not** a Vercel plan/configuration problem to fix by raising a
number. The actual bulk restock work is taking longer than 300 seconds to
complete, most likely when syncing many items in one request — each item
in `restockItemsToUbex()` does a fresh Ubex fetch, a fresh Shopify variant
lookup, and a write, **processed strictly sequentially** ("sequential to
avoid Shopify rate limits," per the existing code comment). Once dual-store
writes land (Section 4.5), each item becomes *two* fresh lookups and *two*
writes — roughly doubling the per-item cost of an already-sequential loop.
A bulk sync of even a few dozen items, or a "sync everything" action after
a mismatch sweep (Section 3.1), can realistically exceed 300 seconds.

**On the frontend, this surfaces as the reported error** — `Unexpected
token 'A', "An error o"... is not valid JSON`. When Vercel kills a function
on timeout, it returns its own plain-text/HTML error page, not JSON.
`RestockQueueProvider.tsx`'s `apiRestockSingle()` / `apiRestockBulk()`
currently do `return res.json()` with no status check and no try/catch —
so instead of a clear "sync timed out" message, the raw JSON-parse failure
leaks straight to the user.

### Fix, part 1 — stop the timeout from happening

**Cap batch size per request, and chunk larger selections client-side.**
Rather than sending one request for "sync all 80 mismatched items," the
frontend splits the selection into batches of a fixed size (e.g. 15–20
items) and sends them as **sequential requests**, each well under the
300-second ceiling. This requires no new backend architecture — the
existing single-request restock endpoint stays as-is, the frontend just
stops sending it more than it can safely finish.

- The sync progress tray (Section 8.9) already shows per-item progress —
  extend it to keep working across chunk boundaries (it already reads from
  shared queue state, so this is mostly free — the tray doesn't need to
  know chunks exist, it just keeps showing items resolve one by one as
  each chunk's response comes back)
- **Bounded concurrency within a chunk** (e.g. 3–4 items at once instead of
  fully sequential) cuts per-chunk time further, while still being gentle
  enough to avoid the Shopify rate-limit concern that motivated the
  original sequential design — worth testing empirically once dual-store
  writes are in, rather than assuming full sequential is still necessary
- **Recommended cap:** start with 15 items/request as a conservative
  default; adjust based on real observed per-item timing once dual-store
  writes are live (measure, don't guess — add basic timing logs to
  `syncShopifyFromUbex()`/`syncShopifyFromUbexBulk()`, per the Part A
  rename in `stock-module-updates-and-analysis-plan.md`, to know the real
  per-item cost before picking a final number)
- If even chunked batches with concurrency prove insufficient for very
  large "sync everything" runs, the next step up is a genuine background
  job — Vercel's own docs point at **Vercel Workflows** for exactly this
  ("pause, resume, and maintain state... without duration limits") — flag
  as a future escalation path, not a first move

### Fix, part 2 — stop the frontend crash regardless of cause

In `components/stock/RestockQueueProvider.tsx`, `apiRestockSingle()` and
`apiRestockBulk()` need defensive response handling:

```ts
async function apiRestockSingle(input: { ubexId: string; barcode: string }): Promise<RestockApiResult> {
  const res = await fetch("/api/stock-balance/restock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (res.status === 504) {
    throw new Error(
      "Sync timed out — it may have partially completed. Check History before retrying.",
    );
  }

  const text = await res.text();
  try {
    return JSON.parse(text) as RestockApiResult;
  } catch {
    throw new Error(`Server returned an unexpected response (${res.status})`);
  }
}
```

Same pattern for `apiRestockBulk()`. This turns a cryptic crash into a
clear, actionable message either way — even for failure modes that aren't
this specific timeout.

### Important edge case this creates for batch tracking

**Cross-reference:** `stock-balance-batch-sync-plan.md`, Section 2. A batch
that times out **never reaches `completeRestockBatch()`** — Vercel kills
the function abruptly, mid-loop, so `completed_at` on that batch row stays
`null` forever, even though items processed *before* the kill were fully
written to Shopify and logged (each `logStockRestock()` call happens
synchronously per item, before the function can be killed) — those
individual log rows are real and correct, just never rolled up into a
finished batch summary.

**Add to the batch-tracking plan:** treat any batch with `completed_at IS
NULL` and `started_at` older than ~6 minutes as *"likely timed out — not
actually still running."* The History page (batch-sync plan, Section 4)
should reflect this distinctly from a genuinely in-progress batch — e.g. a
"Timed out (partial)" state, computed from its actual child log rows
(which are trustworthy) rather than trusting the batch's own
`completed_at`/count fields (which never got written). This is a real gap
the chunking fix (above) reduces the frequency of, but doesn't eliminate
outright — worth handling explicitly rather than leaving timed-out batches
looking like they're stuck "running" indefinitely in the UI.

### B.1 Known edge case — timed-out batches never self-complete

**Confirmed real, not hypothetical** — see
`stock-balance-rebuild-plan.md` Section 9 for the full diagnosis (a
production 504 was found directly in Vercel's runtime logs). If a batch's
request gets killed by Vercel's function timeout mid-loop,
`completeRestockBatch()` (Section 2.2) never runs — `completed_at` stays
`null` forever, even though every item processed *before* the kill has a
real, correct `stock_restock_log` row (each log insert happens
synchronously per item, before the timeout can hit).

**Treat this explicitly in the History UI (Section 4):** a batch with
`completed_at IS NULL` and `started_at` older than ~6 minutes should render
as **"Timed out (partial)"**, not as a batch still silently running
forever. Compute its actual outcome from its child `stock_restock_log`
rows directly (which are trustworthy) rather than the batch row's own
summary counts (which never got written). The chunking fix in the rebuild
plan's Section 9 reduces how often this happens, but doesn't make it
impossible — worth handling in the UI regardless.

---

## Part C — Stock Analysis module (correct version)

**What this module actually is:** a **read-only visibility tool**, separate
from Stock Balance's job of fixing/syncing. Two things:

1. **Search a product** → see exactly how much is committed across both
   stores, how much of that can actually be fulfilled given real Ubex
   stock, and how it's been selling.
2. **A dashboard** → catalog-wide totals for the same thing, plus a
   best-sellers leaderboard.

No sync buttons, no restock actions here — that's Stock Balance's job.
This module only shows numbers.

### C.1 The core formula (per product, by barcode)

```
total_committed   = storeA_committed + storeB_committed
can_be_sent       = min(ubex_stock, total_committed)
short_by          = max(0, total_committed - ubex_stock)
truly_available   = max(0, ubex_stock - total_committed)
```

- **`can_be_sent`** — of everything currently committed (ordered, not yet
  shipped) across both stores, how many units can actually go out today
  given real warehouse stock
- **`short_by`** — orders that physically can't ship yet because there
  isn't enough stock to cover every committed unit — a backorder risk,
  visible here even if nothing on Shopify itself is flagging it
- **`truly_available`** — stock genuinely free, beyond everything already
  owed to existing orders

This reuses the exact same per-store committed numbers as the Stock
Balance rebuild (`fetchShopifyVariantsByBarcode()` per store) — no new
Shopify-side fetching logic needed, just a different formula applied to
the same inputs.

---

### C.2 The real gap: no per-product sales data exists today

Confirmed directly in the code:

- `lib/orders/fetch-orders.ts`'s `FIELDS` constant:
  ```
  "id,name,order_number,customer,shipping_address,total_price,currency,financial_status,fulfillment_status,gateway,payment_gateway_names,created_at"
  ```
  No `line_items`. Every order fetch only ever pulls order-level totals —
  never which products were actually in the order.
- `lib/shopify/types.ts`'s `ShopifyOrder` type has no `line_items` field at
  all.
- The Shopify webhook handler
  (`app/api/webhooks/shopify/[topic]/route.ts`) parses the **full raw
  webhook body** (`JSON.parse(raw) as ShopifyOrder`) — Shopify's own
  `orders/create` webhook payload includes `line_items` by default, so
  that data likely already arrives on every Store 1 webhook call today —
  it's just never extracted or stored. **Verify this assumption once
  implementing** (inspect an actual webhook payload) rather than assuming
  it's guaranteed across all API versions.
- Store 2 has no webhook at all (per `context.md`: *"Only Store 1 has
  webhook registration... Store 2 cache is refreshed via live API fetch
  only"*) — so Store 2 sales data can only ever come from the live-fetch
  path, never a push.

**Bottom line:** best-sellers and "units sold" require a genuinely new
data-collection layer. Below is how to build it without any cron, using
patterns already in your codebase.

---

### C.3 New table — `order_line_items`

### Migration

Use the next unused migration number when implementing. Note: this
replaces the need for migration `018_stock_mismatch_snapshots.sql` from
the now-superseded analysis plan — that table is no longer needed for
this module. If `018` hasn't been used for anything else yet, reuse it
here; otherwise use the next free number.

```sql
-- 0XX_order_line_items.sql
create table if not exists order_line_items (
  id bigint generated always as identity primary key,
  store_id smallint not null default 1,
  shopify_order_id bigint not null,
  shopify_order_name text not null,
  line_item_id bigint not null,
  product_id bigint,
  variant_id bigint,
  sku text,
  barcode text,
  title text not null,
  variant_title text,
  quantity int not null,
  price numeric,
  order_created_at timestamptz not null,
  synced_at timestamptz not null default now(),
  unique (store_id, shopify_order_id, line_item_id)
);

create index if not exists order_line_items_barcode_idx
  on order_line_items (barcode);

create index if not exists order_line_items_sku_idx
  on order_line_items (sku);

create index if not exists order_line_items_created_idx
  on order_line_items (order_created_at desc);

create index if not exists order_line_items_store_created_idx
  on order_line_items (store_id, order_created_at desc);

alter table order_line_items enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'order_line_items' and policyname = 'service_role_all'
  ) then
    create policy service_role_all on order_line_items
      for all to service_role using (true) with check (true);
  end if;
end $$;
```

Normalized (not JSONB) so aggregation queries (best-sellers, units sold by
barcode) are fast, indexed lookups instead of scanning/parsing JSON blobs
on every dashboard load.

---

### C.4 Populating it — three paths, none of them cron

### 4.1 Webhook (Store 1 only, real-time)

Extend `handleOrdersUpsert()` in
`app/api/webhooks/shopify/[topic]/route.ts`: after the existing
`upsertOrderCache(order)` call, also extract `order.line_items` (once the
`ShopifyOrder` type is extended to include it) and upsert each line into
`order_line_items`. This is event-driven (reacting to Shopify's own
webhook), not a scheduled poll — consistent with "no automation" the same
way the existing order-cache webhook already is.

### 4.2 Live-fetch fallback (both stores)

Add `line_items` to the `FIELDS` constant in **both**
`lib/orders/fetch-orders.ts` and `lib/store2/fetch-orders.ts`. Wherever
these already upsert into their respective order caches on a live fetch,
also upsert into `order_line_items`. This is the **only** path Store 2
sales data can come through, since it has no webhook — meaning Store 2's
sales data freshness depends on how often its cache goes stale and gets
live-refetched, not real-time. Worth knowing as an asymmetry between the
two stores (Section 8, open question).

### 4.3 One-time backfill script

New file: `scripts/backfill-order-line-items.ts`, modeled directly on the
existing `scripts/backfill-orders-cache.ts` (same `.env` loading pattern,
same `npx tsx scripts/...` invocation style):

```
npx tsx scripts/backfill-order-line-items.ts [days] [store]
```

Needed because without it, best-sellers would start from zero and take
weeks/months to become meaningful through webhook/live-fetch accumulation
alone. Pulls historical orders (both stores) with `line_items` requested,
upserts into the new table. Respect Shopify's pagination/rate limits the
same way the existing order backfill script already does.

---

### C.5 Aggregation layer — `lib/analysis/sales-aggregates.ts` (new)

```ts
export type SalesWindow = 7 | 30 | 90 | "all-time";

export async function getUnitsSoldForBarcode(
  barcode: string,
  window: SalesWindow,
  storeId?: 1 | 2, // omit for combined
): Promise<number>

export type TopSellingProduct = {
  barcode: string;
  title: string;
  unitsSold: number;
  revenue: number;
};

export async function getTopSellingProducts(
  window: SalesWindow,
  limit: number,
  storeId?: 1 | 2,
): Promise<TopSellingProduct[]>
```

SQL shape for the leaderboard:

```sql
select barcode, title, sum(quantity) as units_sold, sum(quantity * price) as revenue
from order_line_items
where order_created_at >= now() - interval '30 days'
  -- and store_id = 1  (when scoping to one store)
group by barcode, title
order by units_sold desc
limit 10;
```

---

### C.6 Product search — the main interaction

Search input (name/SKU/barcode), reusing the same Ubex search function
already planned for Stock Balance (`searchUbexInventory()`,
`stock-balance-rebuild-plan.md` Section 4.1) — no need to duplicate that
lookup logic.

### Result card

```
┌───────────────────────────────────────────────┐
│  Sloane Maxi                                   │
│  SKU 244135 · barcode 6291041234567            │
├───────────────────────────────────────────────┤
│  INVENTORY                                     │
│  Ubex stock              42                    │
│                                                 │
│  Store A: on hand 40 · available 36 · committed 4 │
│  Store B: on hand 38 · available 34 · committed 4 │
│                                                 │
│  Total committed         8                     │
│  Can be sent now         8    ✓ fully covered  │
│  Truly available         34                    │
├───────────────────────────────────────────────┤
│  SALES                    [ 30 days ▾ ]        │
│  Units sold               126                  │
│  Store A: 71 · Store B: 55                     │
│  Rank: #3 best-seller (30d)                    │
└───────────────────────────────────────────────┘
```

- If `short_by > 0`, the "Can be sent now" line switches to a red-flagged
  state: *"Can be sent now: 6 · ⚠ 2 short — not enough Ubex stock to cover
  all committed orders"*
- Sales window selector (7/30/90 days/all-time) re-queries
  `getUnitsSoldForBarcode()` — client-side dropdown, no page reload
- "Rank" badge only shows if the product is in whatever the current
  leaderboard window's top N is — otherwise omit the line entirely rather
  than showing "not ranked"

---

### C.7 Dashboard — `/stock-analysis/dashboard`

Uses the same reusable dashboard components as every other module
(`ModuleDashboardShell`, `StatCard`, `ChartCard`) — no new dashboard chrome
needed.

### KPI row

| Card | Value |
|---|---|
| Total committed | Sum of `total_committed` across the full catalog, both stores |
| Can be fulfilled now | Sum of `can_be_sent` across the catalog |
| Products short | Count of barcodes where `short_by > 0` — backorder risk count |
| Units sold (14d) | From `order_line_items`, both stores combined |

### Chart

**"Best sellers"** — horizontal bar chart, top 10 products by units sold in
a selectable window (default 30 days) — a variation on the existing
`ActivityBarChart` pattern, just with product names as categories instead
of dates along the axis.

### List — "Currently short"

Small table: products where `short_by > 0`, sorted by how short they are.
This is visibility-only — no restock button here (that's Stock Balance's
job) — but each row can link out to that product's entry in Stock
Balance's Errors or Balance page if you want to go act on it.

### Nav

Single page is enough for v1 — search lives at the top of the same
dashboard rather than a separate page, so there's one place to land. No
"Trends" page for this module (that idea came from the discarded
mismatch-focused version) — revisit only if real usage shows a need for
deeper historical drill-down later.

---

### C.8 Open questions

1. **Best-seller ranking basis** — by units sold, or by revenue
   (`quantity × price`)? Recommend units sold as the default sort, revenue
   as a secondary option.
2. **Default sales window** — 30 days suggested above; confirm that's the
   right default for how you think about "recent performance."
3. **Backfill depth** — how far back should the one-time historical
   backfill go? Bounded by Shopify API pagination practicality — a few
   months is very feasible, a couple of years may take a while to pull
   depending on order volume.
4. **Store 2 freshness gap** — since Store 2 has no webhook, its sales data
   is only as fresh as its last live-fetch-triggered cache refresh. Worth
   deciding whether that's acceptable, or whether adding webhook
   registration for Store 2 (a genuinely separate, larger piece of work,
   outside this module's scope) should be considered later.
5. **`ShopifyOrder` type change** — adding `line_items` to that shared type
   (`lib/shopify/types.ts`) is used across COD, Fulfillment, and now this
   module — confirm no existing code path breaks from the type gaining a
   new optional field (should be safe, but worth a quick check across
   call sites since it's a shared type).

---

### C.9 Suggested build order

1. Migration — `order_line_items` table
2. Extend `ShopifyOrder` type + `FIELDS` constants (both stores) to
   include `line_items`
3. Webhook handler — extract + upsert line items (Store 1)
4. Live-fetch paths — extract + upsert line items (both stores)
5. `scripts/backfill-order-line-items.ts` — seed historical data
6. `lib/analysis/sales-aggregates.ts` — units-sold + top-sellers queries
7. Formula helper — `lib/analysis/commitment.ts` (the `can_be_sent` /
   `short_by` / `truly_available` calculations from Section 1)
8. Module scaffold in `config/modules.ts` (reuse the accent/nav pattern
   from the superseded plan — that part was fine, only the page content
   was wrong)
9. Dashboard page + product search card