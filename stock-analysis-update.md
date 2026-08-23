# Stock Module — Plan Updates + Stock Analysis Module

**Status:** Planning document — no code written yet.
**Purpose of this file:** two things only —
1. The specific corrections needed to the existing plan docs (naming clarity
   fix — nothing functional changes)
2. The Stock Analysis module plan, unchanged from before, included here so
   it's all in one place

This file does **not** restate the full rebuild plan, errors page plan, or
batch sync plan — see those files for everything else. Everything below is
either a targeted patch to those docs, or new content.

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
  Part A of `stock-module-updates-and-analysis-plan.md`."*
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

## Part B — Stock Analysis module (new module, full plan)

*(Unchanged from the standalone version — included here in full so this
file is self-sufficient for the "what's the new module" question, per your
request to have it "along with" the updates above.)*

### B.1 Relationship to Stock Balance

Stock Balance is the *operational* tool — fix mismatches, sync now (writes
to Shopify only, per Part A above). Stock Analysis is the
*reporting/strategic* layer on top of it — trends over time, health over
time, recurring problems. Same underlying data sources, different purpose
— same reason COD and Fulfillment each get their own module rather than
cramming reporting into the same page as daily action.

### B.2 Honest scoping — what's buildable now vs. what needs new data first

**Tier 1 — buildable now**, from `stock_restock_log`,
`stock_restock_batches` (batch sync plan), and a new mismatch-snapshot
table (B.3):
- Sync health trend (success/error over time)
- Mismatch count trend
- Catalog composition (matched/unlinked/ambiguous/skipped breakdown)
- Store A vs Store B comparison for shared SKUs
- Repeat-offender products

**Tier 2 — real gaps, not buildable yet:**

| Question | Why it can't be answered today |
|---|---|
| Days of stock remaining / stockout risk | `lib/orders/fetch-orders.ts`'s `FIELDS` constant never requests `line_items` — no per-SKU sales data exists anywhere in the schema |
| Sell-through rate by store | Same gap — no line-item-level sales data |
| Inventory valuation | Ubex's raw response includes `price`/`cost_per_item` (per `ubex-api.txt`'s sample), but `lib/ubex/inventory.ts`'s `mapRow()` drops both fields today |

**Recommendation:** build Tier 1 now. Treat Tier 2 as a distinct future
phase gated on extending order fetching to capture `line_items` and
extending `UbexInventoryItem`/`mapRow()` to capture `price`/`cost_per_item`.
Don't build placeholder charts with estimated numbers for Tier 2 — an
honest empty state beats a number that looks real but isn't.

### B.3 Module scaffold — `config/modules.ts`

New accent token:

```ts
export const STOCK_ANALYSIS_ACCENT: ModuleAccent = {
  rail: "bg-stock-analysis",
  labelText: "text-stock-analysis",
  labelHover: "hover:bg-stock-analysis-bg",
  activeBg: "bg-stock-analysis-bg",
  activeText: "text-stock-analysis",
  pillBg: "bg-stock-analysis-bg",
  pillText: "text-stock-analysis",
  mobileActive: "text-stock-analysis",
  chartFill: "#4A6FA5",
  chartStroke: "#3A587F",
};
```

*(`#4A6FA5` — muted slate blue, placeholder pending sign-off, distinct from
`awb`'s brighter blue `#2E6BAF` — worth a visual side-by-side check once
implemented.)*

```ts
export type ModuleId = "cod" | "fulfillment" | "stock" | "awb" | "subscriptions" | "stockAnalysis";

function stockAnalysisModule(): PortalModule {
  return {
    id: "stockAnalysis",
    label: "Stock analysis",
    icon: TrendingUp,
    adminOnly: true,
    accent: STOCK_ANALYSIS_ACCENT,
    items: [
      { label: "Dashboard", href: "/stock-analysis/dashboard", icon: LayoutDashboard },
      { label: "Trends", href: "/stock-analysis/trends", icon: TrendingUp },
    ],
  };
}
```

No Settings page for v1 — nothing to configure until Tier 2 introduces
thresholds. Register in `getPortalModules()` alongside `stockModule()` /
`subscriptionsModule()`; add matching entries to `modulePathPrefixes()` and
`MODULE_ROUTE_ENTRIES`, same pattern as every other module.

### B.4 New data — mismatch snapshot history

The mismatch trend chart needs a point-in-time count to plot. No cron, per
your constraint — snapshots are captured **only when a human runs a
mismatch sweep** ("Find all mismatches," rebuild plan Section 3.1). The
trend will be sparse by design — an honest reflection of a manual-first
tool.

Migration — `supabase/migrations/018_stock_mismatch_snapshots.sql`:

```sql
create table if not exists stock_mismatch_snapshots (
  id uuid primary key default gen_random_uuid(),
  captured_at timestamptz not null default now(),
  captured_by uuid,
  total_items int not null,
  matched_count int not null,
  mismatched_count int not null,
  unlinked_count int not null,
  ambiguous_count int not null,
  skipped_count int not null
);

create index if not exists stock_mismatch_snapshots_captured_idx
  on stock_mismatch_snapshots (captured_at desc);

alter table stock_mismatch_snapshots enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'stock_mismatch_snapshots' and policyname = 'service_role_all'
  ) then
    create policy service_role_all on stock_mismatch_snapshots
      for all to service_role using (true) with check (true);
  end if;
end $$;
```

Wire one insert into `loadMismatchedStockBalance()` (rebuild plan, Section
4.7) — after computing the full mismatch set, write one summary row. No
new user action needed; it's a side effect of a sweep that already
happens.

**Repeat-offender tracking:** avoid a second heavy table. Derive this
instead from `stock_restock_log` (barcodes with multiple `status = 'error'`
rows over N days) or directly from the live Errors page data each time it's
viewed — no historical storage needed. Only add per-snapshot barcode
storage later if this proves insufficient in practice.

### B.5 The dashboard — full spec

Uses existing reusable components only — `ModuleDashboardShell`,
`StatCard`, `ChartCard`, `ActivityBarChart`, `ActivityStackedChart`,
`ModuleQuickLinks` — same approach the Stock Balance and COD dashboards
already take.

```
app/(shell)/stock-analysis/dashboard/page.tsx
```

**KPI row (4 `StatCard`s):**

| Card | Value | Source |
|---|---|---|
| SKUs tracked | Total Ubex catalog size | `stock_mismatch_snapshots.total_items`, latest row |
| Mismatched right now | Current mismatch count | Latest sweep, with its age shown if stale |
| Clean sync rate (14d) | `success / (success + error)` % | `stock_restock_log`, same window as today's Stock Balance dashboard |
| Sync errors (14d) | Count of `status = 'error'` | Already computed today, reused here |

**Charts row (2 `ChartCard`s):**

1. **"Mismatch trend"** — `ActivityBarChart`, one bar per sweep (not per
   day — sweeps are irregular). Empty state: *"Run 'Find all mismatches' on
   the Balance page to start tracking this trend."*
2. **"Sync outcomes (14d)"** — `ActivityStackedChart`, combined-store
   success vs. error per day, reusing `bucketStatusRows()` from
   `lib/dashboard/bucket-by-day.ts` — no new charting code needed.

**Two new list/table cards (new small components needed):**

- **"Catalog composition"** — labeled counts with proportional-width bars
  (Matched N · Unlinked N · Ambiguous N · Skipped N), from the latest
  snapshot. New small component:
  `components/dashboard/CompositionBreakdown.tsx`.
- **"Store comparison — shared SKUs"** — ranked list (not a chart), top 10
  shared barcodes by combined committed volume, showing which store is
  currently holding more committed stock for the same product.
- **"Products needing attention"** — small count-and-link card: *"3
  ambiguous, 6 unlinked → view all in Errors"* — doesn't duplicate the
  Errors page, just surfaces the count and links there.

**Quick links:**

```ts
<ModuleQuickLinks
  moduleId="stockAnalysis"
  links={[
    { label: "Balance", href: "/stock-balance/balance", description: "Fix mismatches now" },
    { label: "Errors", href: "/stock-balance/errors", description: "Current problems" },
    { label: "Trends", href: "/stock-analysis/trends", description: "Deeper history" },
  ]}
/>
```

### B.6 `/stock-analysis/trends` page

Not fully speced — a natural v1.5 addition once the dashboard is live and
real usage shows what's worth a deeper page: longer-range trend (30/90
days), filterable by category, per-product history. Build the dashboard
first, decide Trends based on what you actually find yourself wanting to
dig into.

### B.7 Suggested build order

1. Migration `018_stock_mismatch_snapshots.sql`
2. Wire the snapshot insert into `loadMismatchedStockBalance()`
3. `config/modules.ts` — new module, accent, route entries
4. `tailwind.config.ts` — new color tokens
5. `lib/dashboard/load-stock-analysis-summary.ts` (new) — same shape as
   `load-stock-restock-activity.ts`
6. `components/dashboard/CompositionBreakdown.tsx` (new, small)
7. Dashboard page — assembling existing components plus the two new list
   cards
8. Leave `/stock-analysis/trends` for a later pass

**Prerequisite:** the rebuild plan's mismatch sweep (Section 3.1) and the
batch-tracking plan must both be built first — this dashboard has no data
to show until sweeps are being run and batches are being logged.