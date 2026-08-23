# Stock Balance Module — Rebuild Guide

**Status:** Planning document — no code written yet.
**Goal:** Fix two real problems with the current Stock Balance module:

1. It only syncs **Store 1** against Ubex. Store 2 has no coverage at all.
2. Loading the page **always** pages through Ubex's entire inventory
   (10 items/page, rate-limited) even for a quick single-product lookup —
   slow, and only gets slower as the catalog grows. The fix is to make full
   fetches an **explicit, opt-in action** for the "review everything
   mismatched" workflow (Section 3.1), while everyday lookup/search stays
   fast and scoped.

**Explicitly out of scope:** cron jobs / automation. Every sync stays a manual,
user-triggered action, same as today.

---

## 0. Environment readiness — confirmed, no setup needed

Checked directly in Vercel (Production and Preview) before starting this
build. All Store 2 Shopify credentials already exist — added when Store 2
support was built for COD/Fulfillment:

| Env var | Status |
|---|---|
| `SHOPIFY_STORE2_DOMAIN` | ✅ present |
| `SHOPIFY_STORE2_ACCESS_TOKEN` | ✅ present |
| `SHOPIFY_STORE2_API_VERSION` | ✅ present |
| `SHOPIFY_STORE2_TRACKING_COMPANY` | ✅ present (fulfillment-side, confirms Store 2 is fully wired elsewhere) |
| Store 2 location override | Not needed — see below |

**No separate `SHOPIFY_STORE2_LOCATION_ID` is required.** Store 2 is a fully
separate Shopify account from Store 1, so once
`getDefaultShopifyLocation()` is parameterized by `storeId` (Section 4.2),
it independently auto-resolves Store 2's own first active location by
calling *that* store's API — the same auto-detect logic Store 1 already
uses today, just pointed at different credentials. No new manual config,
no new secrets, no dashboard changes required from the user before code
work starts. **This confirms the Store 2 build is a pure code change.**

---

## 1. The core problem being solved

Ubex is a single shared stock pool. Both Store A and Store B sell from the
same physical inventory. Ubex's own stock number only drops once an order is
**packed/fulfilled** at the warehouse — not the moment it's placed on Shopify.

That means between "customer orders on Store B" and "Ubex marks it packed,"
there's a real window where Store A doesn't know that stock is already spoken
for. Syncing each store to Ubex's raw number independently double-allocates
stock in that window — both stores would show the full Ubex quantity as
available, when really only one order's worth is actually free.

### The formula

For each product (matched by barcode):

```
shared_available = ubex_stock − storeA_committed − storeB_committed
```

Both stores get shown this **same** number for "available" — it's not a
split, it's the same real remaining pool visible from both storefronts.

To make Shopify show that number as `available` (on_hand − committed), each
store's `on_hand` needs to be set to:

```
storeA_target_on_hand = ubex_stock − storeB_committed
storeB_target_on_hand = ubex_stock − storeA_committed
```

Sanity check: `storeA_available = storeA_target_on_hand − storeA_committed
= ubex_stock − storeB_committed − storeA_committed` ✓ matches the shared
number above. Same for Store B.

This replaces the current single-store formula in
`lib/stock/stock-balance-target.ts`:

```ts
// current (single-store, wrong for a shared pool)
export function targetShopifyOnHand(ubexStock: number, committed: number | null): number {
  return Math.max(0, Math.floor(ubexStock + (committed ?? 0)));
}
```

→ replace with a two-store-aware version (see Section 4).

---

## 2. UX direction: card list instead of flat table

Reasons this fits the shared-pool problem better than the current table:

- Each product now needs **three** inventory sources shown together (Ubex,
  Store A, Store B) instead of two — a flat table gets cramped fast.
- Search-first browsing (see Section 3) pairs naturally with a card list —
  you search, you get a handful of matching cards, you open the one you want.

### Collapsed card

- Product name (e.g. "Sloane Maxi")
- Status pill: reuse `components/portal/StatusPill.tsx` — but the pill logic
  changes (see below)
- Nothing else — keep the collapsed state scannable

### Expanded card (on click)

| Section | Fields |
|---|---|
| Identity | SKU, barcode, Ubex product ID |
| Ubex | current stock (fresh, fetched on expand — see Section 3) |
| Store A | on-hand, available, committed |
| Store B | on-hand, available, committed |
| Calculated | shared available (the corrected number both stores *should* show) |
| Action | single "Sync both stores" button |

### Status pill logic (important change from today)

Today: pill reflects `ubex_stock !== store1_available` (single-store diff).

New: pill should reflect whether the **corrected shared formula** differs
from what either store currently shows —

```ts
const mismatch =
  storeA.available !== sharedAvailable || storeB.available !== sharedAvailable;
```

This is the whole point of the rebuild: a card can look "fine" under the old
single-store math while still being wrong under the shared-pool math. The
pill has to use the new formula, not the old one, or the UI will lie.

### Reusable components already in the codebase

- `components/ui/GlassCard.tsx` — base card shell (glass surface, hover glow).
  Per its own doc comment, glass is meant for "low-stakes / first-impression"
  surfaces, not dense data — but a collapsed product card with an expand
  affordance is a reasonable exception. If it looks too glass-heavy on a data
  page in practice, fall back to a plain bordered card (`border-line`,
  `bg-white`) matching the confirm-modal style already used in
  `StockBalanceView.tsx`.
- `components/portal/NavCollapsibleSection.tsx` — existing expand/collapse
  pattern to model the card's open/close behavior on.
- `components/portal/StatusPill.tsx` — reuse as-is, just feed it the new
  mismatch logic.
- `hooks/useRestockQueue.ts` / `components/stock/RestockQueueProvider.tsx` —
  existing busy/success/error state machine per row. Extend `RestockRowInput`
  to carry both stores' data instead of one (Section 4).

---

## 3. Search-driven loading (replaces "load everything")

### The bottleneck today

`fetchUbexInventoryAll()` in `lib/ubex/inventory.ts` pages through the
**entire** Ubex catalog — 10 items/page, ~350ms delay between pages by
default (rate-limit protection). For a few hundred SKUs this is easily
10+ seconds before Shopify is even touched.

### The fix

Ubex's own `GET /api/v2/inventory` endpoint already supports a `search`
query param (documented in `ubex-api.txt` around line 1542, currently unused
anywhere in the codebase):

```
GET /api/v2/inventory?search=coffee&page=1&token=...
```

New default behavior:

| Mode | Behavior | Ubex calls |
|---|---|---|
| **No search term** | Load page 1 only (10 items) | 1 |
| **Typing a search term** | `?search=<term>&page=1` | 1 (debounced) |
| **"Load more" (optional)** | Increment page, same search term (or none) | 1 per click |
| **Mismatch sweep (explicit action)** | Full catalog scan, filtered to mismatches only | Many — see 3.1 |

This removes the need to ever fetch the whole catalog up front **for casual
browsing/lookup**. It does not remove the need to ever fetch the whole
catalog, period — see 3.1 for why a full scan is still necessary for one
specific workflow, and how it's kept separate from the fast default.

### 3.1 Mismatch sweep — a separate, explicit full-scan mode

**The use case this serves:** periodically (daily/weekly), you don't want to
look up one product — you want to see *everything* that's currently out of
sync across both stores, in one place, so you can review and bulk-sync in
one pass. That's a fundamentally different question than "find Sloane Maxi,"
and it genuinely requires checking every Ubex item against both stores —
there's no way to know which items are mismatched without comparing all of
them. Ubex's `search` param filters by name/text match, not by "has a
mismatch" — that comparison only exists on our side, after joining with
Shopify.

**So this mode intentionally does the full paginated fetch** the rest of
Section 3 is designed to avoid for normal use — same
`fetchUbexInventoryAll()` pagination, same rate-limit pacing, same
realistic time cost (still 10+ seconds for a few hundred SKUs, more for
larger catalogs). The difference is *when* it happens: only when you
explicitly trigger it, not on every page load or every keystroke.

**How it's triggered:** a dedicated button — e.g. **"Find all mismatches"**
— separate from the search box, on the stock balance toolbar. Not run
automatically on mount (that was today's problem).

**What happens when triggered:**

1. Full `fetchUbexInventoryAll()` — pages through Ubex, same as today's
   behavior, with the same "this may take a bit" loading state
   (`StockBalanceLoader`'s existing copy is actually the right copy for
   *this* mode — it just shouldn't be the copy for the default page load
   anymore)
2. For all returned items, fetch both stores' Shopify data by barcode
   (bulk, using `fetchAllShopifyInventoryAtLocation()` per store — the
   existing full-catalog Shopify fetch that's already efficient via
   GraphQL pagination, not the single-barcode lookup used for search mode)
3. Build rows with the dual-store formula (Section 4.3/4.4)
4. **Filter the result down to `mismatch === true` only** — matched,
   unlinked, ambiguous, skipped, and already-synced rows are silently
   dropped from this view; you only see what actually needs action
5. Render as the same card list — all mismatched cards, ready to
   bulk-select and sync in one sweep

**Caching the sweep result:** since this is expensive, keep the result in
memory/state for the session (don't silently re-run it) — a visible
"Refresh mismatches" button re-triggers the same scan on demand, same
pattern as today's `onRefresh` prop on `StockBalanceView`.

**Relationship to the "Weekly restock preset" filter chip:** the existing
`WEEKLY_RESTOCK_PRESET` (quantity-mismatch-only + no-committed + hide
unlinked/ambiguous) was designed for exactly this workflow already — it
just assumed the full catalog was already loaded (today's eager fetch on
mount). In the rebuilt version, that preset becomes the **default active
filter state** when a mismatch sweep finishes loading, so the two features
compose naturally: sweep fetches everything, the preset narrows it further
to the safest, cleanest set to act on in bulk.

### Per-card Shopify fetch (search / browse mode only)

Once a small set of Ubex items is on screen (search result or page 1), fetch
**both stores'** Shopify numbers only for those barcodes —
`fetchShopifyVariantsByBarcode()` already does a single-barcode GraphQL
lookup and is fast; just call it once per store per visible barcode
(parallelized, same `CONCURRENCY` pattern already in
`lib/shopify/inventory-read.ts`).

Net effect: opening the page or searching becomes a handful of fast, scoped
calls instead of a full-catalog crawl — while the mismatch-sweep button
remains available for the times you deliberately want the full picture.

---

## 4. Data layer changes

### 4.1 New Ubex search function — `lib/ubex/inventory.ts`

Add alongside the existing `fetchUbexInventoryPage`:

```ts
export async function searchUbexInventory(
  query: string,
  page = 1,
): Promise<UbexInventoryItem[]>
```

Same response shape/mapping as `fetchUbexInventoryPage`, just adds
`&search=${encodeURIComponent(query)}` to the request URL. Keep the existing
429 retry loop.

### 4.2 Store 2 support — `lib/shopify/inventory-read.ts` and `inventory-write.ts`

Per Section 0, all required env vars already exist in Vercel — this section
is code-only, no environment setup blocking it.

These currently hardcode Store 1's env vars:

```ts
const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
```

Change every exported function in both files to accept a `storeId: 1 | 2`
parameter and resolve credentials per store — mirroring the existing pattern
in `lib/store2/client.ts` (`isStore2Configured()`,
`SHOPIFY_STORE2_DOMAIN`/`SHOPIFY_STORE2_ACCESS_TOKEN`). Functions to update:

- `getEnv()` → `getEnv(storeId)`
- `getDefaultShopifyLocation()` → `getDefaultShopifyLocation(storeId)`
  (cache keyed by store, not a single module-level variable)
- `fetchShopifyVariantsByBarcode()` → add `storeId` param
- `fetchAllShopifyInventoryAtLocation()` → add `storeId` param (only needed
  if you keep a "load more" full-page browse mode; not needed for the
  search-driven flow)
- `inventory-write.ts`: `setShopifyOnHand()` → add `storeId` param

Guard: if Store 2 isn't configured (`isStore2Configured()` returns false),
the module should degrade gracefully — show Store A only, hide Store B
columns/actions, no shared-pool math applied.

### 4.3 New combined row builder — replaces `lib/stock/build-balance-rows.ts`

Current `StockBalanceRow` has one Shopify side. New shape needs both:

```ts
export type StockBalanceRow = {
  ubexId: string;
  productName: string;
  sku: string;
  barcode: string;
  ubexStock: number;
  storeA: {
    onHand: number | null;
    available: number | null;
    committed: number | null;
    variantId: string | null;
    inventoryItemId: string | null;
  };
  storeB: {
    onHand: number | null;
    available: number | null;
    committed: number | null;
    variantId: string | null;
    inventoryItemId: string | null;
  } | null; // null when Store 2 not configured, or barcode not found there
  sharedAvailable: number | null; // ubex_stock - storeA.committed - storeB.committed
  status: "matched" | "unlinked" | "ambiguous" | "skipped" | "store2-only-unlinked";
  mismatch: boolean; // storeA.available !== sharedAvailable || storeB.available !== sharedAvailable
};
```

Matching rules (extending current logic in `build-balance-rows.ts`):

- `skipped` — no barcode, or Ubex not tracking qty (unchanged)
- `unlinked` — barcode matches neither store
- `ambiguous` — barcode matches >1 variant in **either** store (can't safely
  act on either side)
- `matched` — clean 1:1 in Store A; Store B may or may not have that barcode
  linked (if Store 2 doesn't carry that SKU at all, `storeB` stays `null`,
  formula falls back to single-store math for that row — see Section 6, open
  question 1)

### 4.4 New target formula — `lib/stock/stock-balance-target.ts`

```ts
export function targetShopifyOnHandForStore(
  ubexStock: number,
  otherStoreCommitted: number | null,
): number {
  return Math.max(0, Math.floor(ubexStock - (otherStoreCommitted ?? 0)));
}

export function sharedAvailable(
  ubexStock: number,
  storeACommitted: number | null,
  storeBCommitted: number | null,
): number {
  return Math.max(
    0,
    Math.floor(ubexStock - (storeACommitted ?? 0) - (storeBCommitted ?? 0)),
  );
}
```

Keep the old `targetShopifyOnHand()` around (or delete once nothing calls
it) — it's only correct for the single-store case.

### 4.5 Dual-write restock — `lib/stock/restock-to-ubex.ts`

Current `restockItemToUbex()` writes to one store. New version:

1. Re-fetch fresh Ubex stock for the item (unchanged behavior — always fresh
   at write time, not the stale preview value)
2. Re-fetch fresh committed for **both** stores (race-condition guard,
   same reasoning as today's re-validation step)
3. Compute both target on-hand values via `targetShopifyOnHandForStore()`
4. Write to Store A if its target differs from current on-hand; write to
   Store B if its target differs from current on-hand — **two independent
   writes**, each with its own idempotency key and its own log row
5. Return a combined result so the UI can show per-store success/failure
   independently (one store's write can succeed while the other fails —
   surface both outcomes, don't collapse into one boolean)

Naming note: consider renaming this file/function while touching it —
`restock-to-ubex.ts` / `restockItemToUbex()` writes to **Shopify**, reading
from Ubex. The current name implies the opposite direction. Suggest
`sync-shopify-from-ubex.ts` / `syncItemAcrossStores()`.

### 4.6 Migration — `supabase/migrations/016_stock_restock_store_scope.sql`

`stock_restock_log` and `stock_restock_idempotency` currently have no
`store_id` column (checked — `009_stock_restock_log.sql` doesn't define one).
Add it, following the exact pattern `010_store2.sql` used for
`order_ubex_links`:

```sql
-- 016_stock_restock_store_scope.sql
alter table stock_restock_log
  add column if not exists store_id smallint not null default 1;

create index if not exists stock_restock_log_store_idx
  on stock_restock_log (store_id, created_at desc);

alter table stock_restock_idempotency
  add column if not exists store_id smallint not null default 1;

-- Idempotency key currently hashes barcode + location_id + target_qty + day.
-- Location IDs are globally unique per Shopify shop, so Store A and Store B
-- keys won't collide even without store_id in the key itself — but add the
-- column for auditability/filtering in the history UI regardless.
```

Update `lib/stock/restock-log.ts`:
- `logStockRestock()` — add `storeId` to the insert
- `claimRestockIdempotency()` / `releaseRestockIdempotency()` — add `storeId`
  to the insert (key itself can stay as-is per the comment above, unless you
  want it explicit — either is safe)

### 4.7 New preview loader — replaces `lib/stock/load-stock-balance-preview.ts`

Three entry points instead of one "load everything":

```ts
// Default view — first page, no search
export async function loadStockBalancePage(page = 1): Promise<StockBalancePreview>

// Search view
export async function searchStockBalance(query: string, page = 1): Promise<StockBalancePreview>

// Mismatch sweep — full catalog, filtered to mismatches only (Section 3.1)
export async function loadMismatchedStockBalance(): Promise<StockBalancePreview>
```

`loadStockBalancePage` / `searchStockBalance` internally:
1. Call `fetchUbexInventoryPage(page)` or `searchUbexInventory(query, page)`
2. For the returned items only, fetch Store A + Store B variants by barcode
   in parallel (bounded concurrency, matching the existing pattern)
3. Run `buildStockBalanceRows()` (updated version, Section 4.3)
4. Return rows + pagination info (has-next-page, current page)

`loadMismatchedStockBalance` internally:
1. Call `fetchUbexInventoryAll()` — full paginated fetch, same rate-limit
   pacing as today (no artificial cap; `STOCK_BALANCE_MAX_ITEMS` still
   applies here if set, since this is the one path that still touches the
   whole catalog)
2. Call `fetchAllShopifyInventoryAtLocation()` for **both** stores (bulk
   GraphQL pagination, not per-barcode lookups — efficient at full-catalog
   scale)
3. Run `buildStockBalanceRows()` for every item
4. **Filter to `row.mismatch === true` before returning** — this is the
   one loader that returns a pre-filtered result, by design
5. No pagination info needed — this always returns the complete
   mismatched set in one response

---

## 5. API route changes

### `app/api/stock-balance/preview/route.ts`
Add query params: `?search=<term>&page=<n>`. Calls the new
`searchStockBalance()` / `loadStockBalancePage()` accordingly.

### `app/api/stock-balance/mismatches/route.ts` (new)
`GET`, no query params. Calls `loadMismatchedStockBalance()`. Kept as a
separate route from `preview` (rather than a flag on the same route) since
its cost profile and response shape are genuinely different — it's a
distinct, heavier operation that deserves its own explicit endpoint rather
than hiding a "slow mode" behind a query param on the fast route.

### `app/api/stock-balance/restock/route.ts`
Body shape stays close to today's (`{ ubexId, barcode }` or `{ items: [...] }`)
— no store param needed in the request, since a sync always targets both
stores now. Response shape needs to carry per-store results (Section 4.5).

---

## 6. Open questions to settle before/while building

1. **Barcode exists in Ubex + Store A, but not in Store B at all** (product
   not listed on that storefront) — is that `matched` (sync Store A normally,
   ignore Store B) or should it surface as a distinct status so it's visible
   that Store B doesn't carry it? Recommend a distinct status
   (`store-b-not-listed` or similar) so it doesn't get confused with a true
   `unlinked` (barcode mismatch/typo) case.
2. **Card list pagination** — when browsing without a search term, do you
   want a simple "Load 10 more" button, or is search-only sufficient day to
   day (i.e., you always know roughly what you're looking for)? Affects
   whether `fetchAllShopifyInventoryAtLocation()` (full-catalog Shopify page)
   is still needed at all, or can be dropped entirely.
3. **History page** (`app/(shell)/stock-balance/history/page.tsx`,
   `components/stock/StockBalanceHistoryTable.tsx`) — should it show both
   stores' writes interleaved (one timeline, `store_id` as a column), or
   split into two tabs? Lean toward one interleaved timeline since a single
   "sync" action now always touches both stores together.

---

## 7. Suggested build order

1. Migration `016_stock_restock_store_scope.sql` (safe, additive, no app
   changes depend on it yet)
2. `lib/ubex/inventory.ts` — add `searchUbexInventory()`
3. `lib/shopify/inventory-read.ts` + `inventory-write.ts` — add `storeId`
   param throughout
4. `lib/stock/stock-balance-target.ts` — new dual-store formulas
5. `lib/stock/build-balance-rows.ts` — new combined row shape
6. `lib/stock/load-stock-balance-preview.ts` — new search-driven loaders
7. `lib/stock/restock-to-ubex.ts` + `lib/stock/restock-log.ts` — dual-write +
   store-scoped logging
8. API routes (`preview`, `restock`) — wire up new params/response shapes
9. UI: card list + expand/collapse + search box (new component, replaces
   `StockBalanceView.tsx`'s table body — keep the confirm-modal pattern)
10. History page — add store_id column/filter (Section 6, open question 3)

Steps 1–8 are backend-only and testable independently (via the API routes
directly) before touching any UI — recommend building and verifying the
formula/dual-write behavior first, then building the card UI on top of a
known-correct data layer.

---

## 8. UI rebuild — full spec

Everything below governs the actual pixels: what gets replaced, what design
rules apply, and file-by-file changes for the four pages under
`app/(shell)/stock-balance/`.

### 8.1 Design system rules that apply here (from `design-plan.md`)

Two rules from the existing design doc directly affect this rebuild and are
easy to violate by accident:

1. **No glass on Stock Balance.** `design-plan.md` Section 1 draws a hard
   line: glass (`GlassCard`) is for the launcher, modals, and empty states
   only — "flat, opaque, `bg-white`" for module workbench pages. Section 8's
   do/don't table repeats it explicitly: *"Put glass on the fulfillment table
   or stock grid"* is listed under **Don't**. This reverses what an earlier
   pass of this plan suggested — **do not use `GlassCard` for the product
   cards.** Use a plain bordered surface instead:
   ```
   rounded-card border border-line bg-white shadow-soft
   ```
   (the same classes the current table wrapper already uses).
2. **No animating numbers.** Section 6's "what NOT to animate" list
   explicitly calls out *"anything inside Stock Balance's comparison
   table"* — numbers should snap, not tween, so staff can trust what they're
   scanning. This applies to the new cards too: on-hand/available/committed
   values update instantly on refresh, no count-up/count-down animation.
   Row/card **enter and exit** (e.g. a card leaving a filtered view) can
   still animate per the fulfillment-row precedent — that's a state-change
   confirmation, not a number tweening.
3. **Numbers go in mono.** Every quantity, SKU, barcode, and Ubex ID renders
   in the mono font face (`font-mono tabular-nums`, matching `tdUbex`/
   `tdShopify` in the current `StockBalanceView.tsx`) — this is already
   followed in today's table and carries over unchanged.
4. **Module color stays olive-gold.** `stock` token
   (`#6B8A3E` / `bg-stock` / `bg-stock-bg`) is already used for Store A's
   column styling today — keep using it for Store A. Store B needs a second,
   distinct accent color added to `config/modules.ts` (see 8.4) so the two
   stores are visually distinguishable without a legend.

### 8.2 Component inventory — build vs. reuse

| Component | Action | Notes |
|---|---|---|
| `components/stock/StockBalanceView.tsx` | **Replace** | Table body → card list. Keep: banner copy, filter chips row, "Weekly restock preset" button, confirm modal, `Refresh` button, footer summary line. |
| `components/stock/StockBalanceLoader.tsx` | **Modify — keep both loading states** | Default search/browse path gets the fast inline-spinner treatment (drop "may take a minute" copy there). The existing full-page "may take a minute" copy is *kept, unchanged*, and reused specifically for the mismatch-sweep mode (Section 3.1, 8.5) — it's still accurate there. |
| `components/stock/StockBalanceCard.tsx` | **New** | The collapsed/expanded product card (8.3). |
| `components/stock/StockBalanceSearchBar.tsx` | **New** | Debounced search input + "load more" pagination (8.5). |
| `components/portal/StatusPill.tsx` | **Reuse as-is** | Feed it the new `mismatch` boolean (Section 4.3), not the old per-store status. |
| `components/ui/GlassCard.tsx` | **Do not use here** | Per 8.1 rule 1. |
| `hooks/useRestockQueue.ts` + `RestockQueueProvider.tsx` | **Extend** | `RestockRowInput` needs both stores' data; state map stays keyed by `ubexId`, unaffected structurally. |
| `hooks/useStockBalancePreview.ts` | **Replace** | Becomes search/page-driven instead of one eager full-catalog fetch (8.5). |
| `components/stock/StockBalanceHistoryTable.tsx` | **Extend** | Add store column (8.6). |

### 8.3 `StockBalanceCard.tsx` — detailed spec

**Collapsed state** (default, in the list):

```
┌─────────────────────────────────────────────────┐
│  Sloane Maxi                          [● Synced] │
│  SKU 244135 · CVDS-1029                          │
└─────────────────────────────────────────────────┘
```

- Plain bordered card: `rounded-card border border-line bg-white`,
  `hover:bg-canvas/80` on hover (matches existing row-hover treatment in the
  table, no glass glow)
- Left: product name (`Instrument Sans`, medium weight per body-text rule —
  nothing above 500), SKU/barcode subline in mono, muted color (`text-muted`)
- Right: `StatusPill` — tone `green` "Synced" when `!mismatch`, tone `amber`
  "Needs sync" when `mismatch`, tone `red` "Ambiguous", tone `neutral`
  "Unlinked"/"Skipped" — same tone mapping convention as today's
  `statusTone` object, just driven by the new field
- Click anywhere on the card header toggles expand — use the same CSS
  grid-rows transition technique already in `NavCollapsibleSection.tsx`
  (`grid-template-rows: 0fr → 1fr` on the expandable panel) rather than
  `AnimatePresence` height animation, for a lighter/more instant feel per
  the "no bounce, feels instant" motion rule

**Expanded state** (grid-rows panel opens below the header):

```
┌─────────────────────────────────────────────────┐
│  Sloane Maxi                          [● Synced] │
│  SKU 244135 · CVDS-1029                          │
├─────────────────────────────────────────────────┤
│  UBEX                                            │
│  Stock: 42                                       │
│                                                   │
│  STORE A (Bahrain)          STORE B (GCC)        │
│  On hand      40            On hand      38      │
│  Available    36            Available    34      │
│  Committed     4            Committed     4      │
│                                                   │
│  Shared available: 34                            │
│  (both stores should show 34)                    │
│                                                   │
│               [ Sync both stores ]               │
└─────────────────────────────────────────────────┘
```

- Two-column layout on desktop (`grid grid-cols-2 gap-4`), stacked on mobile
  (`grid-cols-1`) — matches the responsive convention used elsewhere in the
  shell
- Store A column keeps the existing `stock` accent
  (`bg-stock-bg`/`text-stock`) already used in `thShopify`/`tdShopify`
  classes today; Store B gets a new accent (8.4)
- "Shared available" row sits below both columns, visually distinct
  (`border-t border-line pt-2`), mono font, bold-ish weight (500 max)
- If Store B is not configured or the barcode isn't linked there, replace
  Store B's column with a muted placeholder: *"Not listed on Store B"* —
  don't hide the column, since consistent layout matters for fast scanning
  across many cards
- "Sync both stores" button: disabled + spinner while busy (reuse
  `RestockIconButton`'s busy/done/err pattern from the current file, just
  relabeled as a full-width button here instead of an icon button), opens
  the existing confirm-modal pattern (unchanged — already dialog-based,
  already shows before→after) with before→after now shown **for both
  stores**

**Bulk selection** (kept from today, adapted to cards):
- Checkbox in the collapsed card header (only visible/enabled when
  `mismatch === true`, same restockable-gating logic as today)
- "Select all matching" / "Clear selection" / "Restock selected (N)" buttons
  stay in the toolbar above the list, unchanged in behavior — bulk sync
  now dual-writes per selected card instead of single-store writes

### 8.4 New Store B accent token — `config/modules.ts`

Add alongside the existing `STOCK_ACCENT`:

```ts
export const STOCK_STORE_B_ACCENT = {
  // pick a color distinct from stock's olive-gold and not already claimed
  // by cod (teal-green) / fulfillment (rust) / subscriptions (purple) / awb (blue)
  // e.g. a muted slate-blue-gray, sampled to sit quietly next to stock's olive
  DEFAULT: "#5C6B73",
  bg: "rgba(92,107,115,0.12)",
  text: "#5C6B73",
} as const;
```

This is a **column accent within the stock module**, not a new nav module —
don't add it to the `ModuleAccent` type used for sidebar sections; keep it
as a small standalone constant used only inside `StockBalanceCard.tsx`.

### 8.5 Search bar + pagination — `StockBalanceSearchBar.tsx` + `useStockBalancePreview.ts`

Replaces the current unconditional full-catalog fetch on mount.

```
┌───────────────────────────────────────────────────────────┐
│ 🔍 Search product, SKU, or barcode…    [ Find all mismatches ] │
└───────────────────────────────────────────────────────────┘
  Showing page 1 · [Load 10 more]
```

- Debounce input ~300ms before firing `searchStockBalance(query)`
  (Section 4.7)
- Empty search box → `loadStockBalancePage(1)` (today's "page 1, no filter"
  default from Section 3)
- "Load 10 more" button appends the next page's cards to the list (keeps
  current search term if one is active) — resolves Open Question 2 from
  Section 6 in favor of keeping a browse mode, rather than search-only
- **"Find all mismatches" button** (new, Section 3.1) — sits beside the
  search box, visually secondary (outline style, not the primary
  black-fill button) since it's an occasional, heavier action, not the
  default interaction. Clicking it:
  - Clears/ignores whatever search term is active
  - Switches the list into the loading state described below
  - On completion, replaces the card list with the full mismatched set,
    and auto-applies the `WEEKLY_RESTOCK_PRESET` filter chips as the
    starting state (Section 3.1) — user can still toggle chips off if they
    want to see ambiguous/unlinked mismatches too
  - A small label above the list makes the mode explicit, e.g. *"Showing
    all mismatches (42 found) · [Back to search]"* — so it's never
    ambiguous whether you're looking at a search result or the full sweep
- Filter chips (`Quantity mismatch`, `No committed`, `Hide unlinked`,
  `Hide ambiguous`) and the `Weekly restock preset` button stay exactly as
  they are today, applied client-side to whatever cards are currently loaded
  — they're not a substitute for search, they narrow what's already on
  screen (and, per above, they're what narrows the mismatch-sweep result
  too)
- Loading state, **two variants depending on mode**:
  - **Search/browse (fast):** small inline spinner next to the search
    icon, not blocking — this is the direct fix for the current
    `StockBalanceLoader.tsx` copy ("may take a minute... you will get a
    notification") which no longer applies to this path
  - **Mismatch sweep (slow, by design):** this is the one place in the
    rebuilt UI where the current `StockBalanceLoader.tsx` full-page
    loading copy is still the *correct* copy — reuse it here, unchanged,
    since a full catalog scan genuinely can take a while and the user
    explicitly asked for it by clicking the button

### 8.6 History page — `StockBalanceHistoryTable.tsx`

Per Section 6, Open Question 3 — recommended resolution: **one interleaved
timeline**, not split tabs, since a sync action now always touches both
stores together.

- Add a `Store` column, values "A" / "B", styled with each store's accent
  color as a small colored dot + label (not a full pill — keep the table
  dense)
- Two log rows now appear per sync action (one per store) where today there
  was one — group them visually with a subtle connecting indicator (e.g. a
  shared left border color, or literally adjacent rows since they'll share
  the same timestamp) so it reads as "one sync, two outcomes" rather than
  two unrelated events
- Filtering by store (dropdown, matches the existing filter-chip visual
  style) so you can isolate "just Store B's history" when needed

### 8.7 Dashboard page — `app/(shell)/stock-balance/dashboard/page.tsx`

Out of scope for the core rebuild (not discussed yet), but flagging for
awareness: if this page currently shows any single-store mismatch count/KPI
sourced from the old `summarizeStockBalanceRows()`, it needs the same
`mismatch` field update as the card status pill (Section 4.3) or its numbers
will disagree with what the cards show. Worth a quick check once the data
layer changes land, even if no visual redesign is needed here.

### 8.8 Settings page — `app/(shell)/stock-balance/settings/page.tsx`

Not reviewed in detail yet — flag as a follow-up check once Store 2 env vars
(`SHOPIFY_STORE2_DOMAIN` / `SHOPIFY_STORE2_ACCESS_TOKEN`) are wired through
Section 4.2, in case this page surfaces which stores/locations are active
and needs a Store B row added.

### 8.9 Bottom-right sync progress tray — `components/stock/SyncProgressTray.tsx` (new)

**What's already there, and why it's not enough on its own:** the codebase
already has `RestockQueueProvider` mounted once at the shell layout
(`components/portal/PortalStockBalanceShell.tsx`), so restock state
genuinely does survive navigating between pages — and there's already a
topbar indicator, `RestockStatusIndicator.tsx`, that shows an ambient
*"Restocking 3 items…"* pill while a sync is running. That's a good
foundation, but it's a **count only** — it doesn't show *which* products,
or which ones already finished vs. which are still going. That per-product
breakdown is what's being added here, in a **persistent bottom-right tray**
rather than the topbar pill.

**Relationship to the existing indicator:** keep
`RestockStatusIndicator.tsx` in the topbar as-is — it's a lightweight
always-visible signal. The new tray is the expanded, detailed view; clicking
the topbar pill can optionally open/focus the tray instead of navigating
away, though navigating to `/stock-balance/balance` (today's behavior)
is still fine as a fallback.

**Where it lives:** mounted once, at the same shell level as
`RestockQueueProvider` itself — i.e. in `PortalStockBalanceShell.tsx` — so
it's visible from **any** page in the app while a sync is running or has
recently finished, not just the Balance/Errors pages. This matters directly
for the Errors page's "Retry sync" action (`stock-balance-errors-page-plan.md`,
Section 4) — if you retry a sync from Errors and then click over to check
something else, the tray keeps showing progress instead of the feedback
disappearing.

**Layout:**

```
                                          ┌──────────────────────────┐
                                          │  Syncing 5 products   ✕  │
                                          ├──────────────────────────┤
                                          │  ✓ Sloane Maxi           │
                                          │  ✓ Rowan Knit Top        │
                                          │  ⟳ Aria Blazer           │
                                          │  ○ Denim Wide Leg        │
                                          │  ○ Cotton Poplin Shirt   │
                                          ├──────────────────────────┤
                                          │  2 of 5 done             │
                                          └──────────────────────────┘
```

- Fixed position, bottom-right, `fixed bottom-4 right-4 z-40` — sits above
  page content, below modals (confirm-modal `z-50` still wins)
- Per-row icon states, reusing the exact same icon language already
  established in `RestockIconButton` in today's `StockBalanceView.tsx`:
  - `○` idle/queued (`text-muted`, not yet started)
  - `⟳` busy (`Loader2` + `animate-spin-slow`, matches existing spinner)
  - `✓` success (`Check`, `text-[#4CAF50]`)
  - `✗` error (`AlertCircle`, `text-[#C25151]`) — clicking an errored row
    here can deep-link to that product's Errors card
    (`/stock-balance/errors`) for the full message, rather than duplicating
    the full error text in this compact tray
- Footer line: live "`N of M done`" count, mono numerals
- Dismiss (`✕`) — manually closable at any time; auto-dismiss ~4s after
  the **last** item finishes (success or error) if the person hasn't
  already dismissed it — matches the transient, non-blocking feel of the
  existing `sonner` toasts already used elsewhere in this provider
  (`toast.success`, `toast.loading`, etc.)
- Not draggable/resizable — keep it simple, fixed size, scrollable list
  internally if more than ~6 products are syncing at once
  (`max-h-64 overflow-y-auto`)
- No glass, no bounce-in animation — plain bordered surface
  (`rounded-card border border-line bg-white shadow-soft`, consistent with
  Section 8.1's flat-surface rule for anything data-bearing) sliding in
  from the bottom edge with a simple opacity/translate transition, once,
  not per-row (per-row number/icon changes should snap, not animate, same
  "don't animate cell values" rule from `design-plan.md` Section 6)

**Data source — no new state needed:** this reads directly from the
existing `RestockQueueContext.state` map (`RestockRowStateMap`, already
keyed by `ubexId` with `idle | busy | success | error`) — the tray is a new
**view** over data the provider already tracks, not a new tracking
mechanism. The one addition needed to the provider: a way to know the
**product names** for currently-tracked `ubexId`s, since today's
`RestockRowState` only stores `status`/`message`, not the name. Store the
initiating `RestockRowInput` (which already includes `productName`)
alongside the state, e.g. extend `RestockRowStateMap`'s value type to
include the input that started it, or keep a small parallel
`Record<string, string>` of `ubexId → productName` populated when
`restockOne`/`restockBulk` are called.

**Works identically for both trigger points:**
- Bulk sync from the Balance page's card list (multi-select → "Restock
  selected")
- Single "Retry sync" from an Errors page card

Both already funnel through the same `restockOne` / `restockBulk` functions
in `RestockQueueProvider` — no separate wiring needed per trigger point,
the tray just reflects whatever's currently in the shared queue state
regardless of where it was started from.

### 8.10 Suggested UI build order (extends Section 7)

Once steps 1–8 (backend) are done and verified via the API routes directly:

9. `StockBalanceCard.tsx` — build with static/mock data first, get the
   collapsed + expanded states and the grid-rows transition right in
   isolation
10. `StockBalanceSearchBar.tsx` + updated `useStockBalancePreview.ts` — wire
    real search/pagination
11. `StockBalanceView.tsx` — swap table body for the card list, keep the
    existing toolbar/filters/confirm-modal shell around it
12. `StockBalanceLoader.tsx` — simplify loading copy/state
13. `StockBalanceHistoryTable.tsx` — add store column
14. `SyncProgressTray.tsx` (Section 8.9) — small addition to
    `RestockQueueProvider`'s state shape (product names alongside status),
    then the tray component itself, mounted in `PortalStockBalanceShell.tsx`
15. Spot-check dashboard (8.7) and settings (8.8) pages for anything that
    silently assumed single-store data