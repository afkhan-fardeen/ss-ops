# Stock Balance — Errors Page — Build Guide

**Status:** Planning document — no code written yet.
**Depends on:** `stock-balance-rebuild-plan.md` (this page is built on top of
the new dual-store data layer and card components from that plan — build
that first).

**Goal:** A dedicated nav item, **below "Balance"** in the Stock Balance
module's sidebar, that answers one question at a glance: *"what's currently
wrong, and exactly why?"* — as cards, not a table, each one stating the
specific problem in plain language (ambiguous, unlinked, skipped, or an
actual sync failure), not just a status word.

---

## 1. Why this is a different page from History, not a rename of it

These two pages answer genuinely different questions and both stay:

| Page | Question it answers | Data source |
|---|---|---|
| **History** (existing) | "What sync actions have been *taken*, and did they succeed?" | `stock_restock_log` — a log of past write attempts |
| **Errors** (new) | "What is *currently* broken or unsynced, right now?" | Live comparison (Ubex + both stores) **plus** the most recent unresolved failures from `stock_restock_log` |

History is a log — it only knows about syncs someone actually attempted.
Errors also needs to surface problems **nobody has tried to fix yet** —
an unlinked barcode that's never been synced has no history row at all,
but it absolutely belongs on the Errors page.

---

## 2. The two categories of "error" this page covers

### Category A — Data-quality issues (can't sync, structural problem)

Computed live, same source as the Balance page's row-building logic
(`buildStockBalanceRows()` from the rebuild plan, Section 4.3):

| Status | What it actually means | Why it can't be synced |
|---|---|---|
| `unlinked` | Barcode exists in Ubex, but no Shopify variant (in either store) has that barcode | Nothing to write to — likely a missing/typo'd barcode in Shopify, or the product was never added there |
| `ambiguous` | The same barcode matches **more than one** Shopify variant | Can't safely pick which variant to update — likely a duplicate barcode entered on two different products/variants |
| `skipped` | No barcode in Ubex at all, or Ubex has quantity-tracking turned off for this item | Nothing to compare — either a data-entry gap in Ubex, or intentional (some items aren't stock-tracked) |
| `store-b-not-listed` *(new, from rebuild plan Section 6, Q1)* | Barcode matches in Store A but Store B doesn't carry this product | Not an error exactly, but worth surfacing here too — you may not realize a shared SKU isn't listed on both storefronts |

### Category B — Sync failures (attempted, and it failed)

Pulled from `stock_restock_log` where `status = 'error'`, **not yet
superseded by a later successful sync for the same barcode**:

- Real API/network failures — e.g. Shopify rejected the write, Ubex
  timed out mid-fetch, a race condition where the variant changed between
  read and write
- The `error` field on `stock_restock_log` already captures the raw
  message (see `lib/stock/restock-to-ubex.ts` — every failure path calls
  `logStockRestock({ status: "error", error: message, ... })`) — this page
  just needs to surface that message clearly instead of truncating it in a
  table cell like today's History table does (`max-w-[200px] truncate`)

**"Not yet superseded" matters:** if a barcode failed yesterday but synced
successfully today, it shouldn't still show as an active error. Filter to
the **latest** log row per barcode, only surface it here if that latest row
is `status = 'error'`.

---

## 3. Nav placement

`config/modules.ts` — `stockModule()` items array, insert directly after
Balance:

```ts
function stockModule(): PortalModule {
  return {
    id: "stock",
    label: "Stock balance",
    icon: Warehouse,
    adminOnly: true,
    accent: STOCK_ACCENT,
    items: [
      { label: "Dashboard", href: "/stock-balance/dashboard", icon: LayoutDashboard },
      { label: "Balance", href: "/stock-balance/balance", icon: Warehouse, aliases: ["/stock-balance"] },
      { label: "Errors", href: "/stock-balance/errors", icon: AlertTriangle }, // ← new
      { label: "History", href: "/stock-balance/history", icon: History },
      { label: "Settings", href: "/stock-balance/settings", icon: Settings2 },
    ],
  };
}
```

Also add the matching entry to `MODULE_ROUTE_ENTRIES` (same file, further
down) so the topbar title/breadcrumb resolves correctly:

```ts
{
  path: "/stock-balance/errors",
  title: "Errors",
  moduleId: "stock",
  moduleLabel: "Stock balance",
  accent: STOCK_ACCENT,
},
```

And add `"/stock-balance/errors"` to `modulePathPrefixes("stock")`'s
returned array so it's recognized as part of the module for active-state
highlighting.

**Badge count on the nav item (recommended):** show the live error count as
a small number next to "Errors" in the sidebar, same visual treatment as an
unread-count badge — cheap to compute (count query against the mismatch
sweep result, or a lightweight separate count-only endpoint), and it turns
this into something people check proactively instead of a page they have to
remember exists.

---

## 4. Page structure

```
app/(shell)/stock-balance/errors/page.tsx
```

```
┌───────────────────────────────────────────────────────┐
│  ⚠ Stock Balance Errors                                │
│  14 issues need attention · 3 sync failures            │
├───────────────────────────────────────────────────────┤
│  [ All (14) ]  [ Unlinked (6) ]  [ Ambiguous (2) ]     │
│  [ Skipped (3) ]  [ Sync failures (3) ]                │
├───────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────┐    │
│  │  Sloane Maxi                    [● Unlinked]   │    │
│  │  SKU 244135 · barcode 6291041234567            │    │
│  │  ─────────────────────────────────────────     │    │
│  │  No Shopify variant found with this barcode    │    │
│  │  in Store A or Store B.                        │    │
│  │                                                 │    │
│  │  Likely cause: the barcode may be missing,     │    │
│  │  mistyped, or the product hasn't been added    │    │
│  │  to Shopify yet.                                │    │
│  │                                                 │    │
│  │  [ Open in Ubex ]                              │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
│  ┌───────────────────────────────────────────────┐    │
│  │  Rowan Knit Top                 [● Ambiguous]  │    │
│  │  SKU 244201 · barcode 6291049998887            │    │
│  │  ─────────────────────────────────────────     │    │
│  │  This barcode matches 3 different Shopify      │    │
│  │  variants in Store A.                          │    │
│  │                                                 │    │
│  │  Likely cause: the same barcode was entered on │    │
│  │  more than one product/variant by mistake.     │    │
│  │                                                 │    │
│  │  Matches: Rowan Knit Top — S, Rowan Knit Top    │    │
│  │  — M, Rowan Sweater — One Size                  │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
│  ┌───────────────────────────────────────────────┐    │
│  │  Aria Blazer                     [● Sync failed]│   │
│  │  SKU 244310 · barcode 6291045551122            │    │
│  │  ─────────────────────────────────────────     │    │
│  │  Attempted 2 hours ago by fardeen@seissense.io │    │
│  │                                                 │    │
│  │  Shopify REST 429: Rate limit exceeded          │    │
│  │                                                 │    │
│  │  [ Retry sync ]                                │    │
│  └───────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────┘
```

### Header
- Count summary line: total issues + separate sync-failure count (people
  care about these differently — a data-quality issue needs someone to fix
  Shopify/Ubex data; a sync failure might just need a retry)

### Filter tabs (not chips — tabs, since categories are mutually exclusive
here, unlike Balance's overlapping filter checkboxes)
- All / Unlinked / Ambiguous / Skipped / Store B not listed / Sync failures
- Counts shown in each tab label
- Same pill/tab visual style as the existing `StoreSwitcherTabs.tsx` pattern
  (active tab gets the `layoutId`-animated pill background per
  `design-plan.md` Section 6's store-switcher example — reuse that pattern
  here rather than inventing a new tab component)

### Error cards

Each card is a **flat, non-collapsible** card (unlike Balance's
expand/collapse cards — there's no "more detail to reveal," the whole point
is showing the detail immediately):

- Product name + SKU/barcode subline (same header style as Balance cards,
  for visual consistency across the module)
- `StatusPill` reused, tone mapping:
  - `unlinked` → amber
  - `ambiguous` → red
  - `skipped` → neutral
  - `store-b-not-listed` → neutral
  - sync failure → red
- **A plain-language explanation sentence** — not just the status word.
  This is the actual point of the page. Fixed copy per status, e.g.:
  - unlinked: *"No Shopify variant found with this barcode in Store A or
    Store B."*
  - ambiguous: *"This barcode matches N different Shopify variants in
    [store]."* — list the matching variant names/labels so the person
    knows exactly which products collide
  - skipped (no barcode): *"Ubex has no barcode recorded for this item."*
  - skipped (qty tracking off): *"Ubex isn't tracking quantity for this
    item, so it can't be compared."*
  - sync failure: show the **raw error message** in full (not truncated —
    this is the one place today's History table cuts it off at
    `max-w-[200px] truncate`), plus who attempted it and when
- **"Likely cause" line** — one extra sentence of plain-language guidance
  per status (shown above), so a non-technical staff member reading this
  page knows roughly what to go check, not just that something's wrong
- Category-specific action:
  - `unlinked` / `skipped` — no sync action possible (nothing to act on
    from this app); optionally a link out to the Ubex admin item page if
    Ubex exposes one (`Open in Ubex`, using the item's Ubex ID in a URL —
    confirm the URL pattern before building this button, not guessed)
  - `ambiguous` — same, no safe automated action; list the colliding
    variant names so a human can go fix the duplicate barcode in Shopify
  - sync failure — **"Retry sync" button**, re-runs the exact same sync
    action that failed (reuses the existing `restockItemToUbex` /
    dual-write sync from the rebuild plan, Section 4.5) — this is the one
    category where a one-click fix genuinely makes sense

---

## 5. Data layer

### 5.1 New loader — `lib/stock/load-stock-errors.ts`

```ts
export type StockErrorCategory =
  | "unlinked"
  | "ambiguous"
  | "skipped"
  | "store-b-not-listed"
  | "sync-failed";

export type StockErrorCard = {
  category: StockErrorCategory;
  ubexId: string;
  productName: string;
  sku: string;
  barcode: string;
  // populated for ambiguous rows only
  matchingVariants?: { store: "A" | "B"; label: string }[];
  // populated for sync-failed rows only
  syncFailure?: {
    logId: string;
    attemptedAt: string;
    attemptedBy: string | null;
    message: string;
  };
};

export async function loadStockErrors(): Promise<{
  cards: StockErrorCard[];
  counts: Record<StockErrorCategory | "all", number>;
  error: string | null;
}>
```

Internally:
1. Data-quality cards: reuse the mismatch-sweep data path from the rebuild
   plan (`loadMismatchedStockBalance()`'s underlying full-catalog join,
   Section 4.7) — but here, filter to `status !== "matched"` instead of
   `mismatch === true`. These are two different filters over the same
   underlying joined dataset, so the join logic itself isn't duplicated,
   just filtered differently for this page.
2. Sync-failure cards: query `stock_restock_log`, latest row per
   `(barcode, store_id)`, where that latest row's `status = 'error'` — this
   is the "not yet superseded" rule from Section 2. SQL sketch:
   ```sql
   select distinct on (barcode, store_id) *
   from stock_restock_log
   order by barcode, store_id, created_at desc
   ```
   then filter the result client-side (or in a second `where`) to
   `status = 'error'`.
3. Merge both into one `cards` array, compute `counts` per category.

### 5.2 API route — `app/api/stock-balance/errors/route.ts`

`GET`, no params (or optional `?category=` if you want server-side
filtering instead of client-side tab switching — client-side is simpler
and the dataset here is small by definition, recommend client-side).

### 5.3 Retry action

Reuses the existing restock endpoint —
`POST /api/stock-balance/restock` with `{ ubexId, barcode }` (Section 4 of
the rebuild plan) — no new write endpoint needed. "Retry sync" on a card is
just this same call, scoped to that one item.

**Progress feedback:** once triggered, retry progress shows in the
bottom-right sync progress tray (`stock-balance-rebuild-plan.md`,
Section 8.9) — same shared queue/tray used for bulk syncs from the Balance
page, since both funnel through the same `restockOne` call. No separate
progress UI needed on this page itself.

---

## 6. Open questions

1. **"Open in Ubex" link** — does Ubex expose a usable admin URL per
   inventory item (e.g. `https://app.ubex.../inventory/{id}`)? Not
   confirmed from `ubex-api.txt` — needs a quick manual check in the Ubex
   dashboard before building this button. If no such URL exists, drop the
   button and just show the Ubex ID as plain text for manual lookup.
2. **Sync-failure retention** — should old, superseded failures (fixed by a
   later successful sync) be fully hidden, or shown in a collapsed
   "resolved" section for a short audit trail? Recommend fully hidden here
   — that's what the History page is already for.
3. **Badge count refresh rate** — the sidebar badge (Section 3) needs a
   refresh strategy. Since this is manual-first (no cron), recommend
   recomputing it whenever the Balance or Errors page is visited/refreshed,
   not on a timer — consistent with the "nothing runs on its own" principle
   from the rebuild plan.