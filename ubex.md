# Ubex Inventory Module — Build Guide

**Status:** Planning document — no code written yet.
**Supersedes:** `stock-analysis-inventory-sales-plan.md` and Part C of
`stock-module-latest-updates-and-analysis.md` — both replaced by this,
per your decision to drop the Shopify/committed/sales angle entirely.

**What this module is:** a simple, read-only **Ubex-only** inventory
browser. Search or browse products by name, click one, see every barcode
(variant) under that product and its live Ubex stock quantity. Nothing
else — no Shopify data, no commitment math, no sales figures, no sync
actions.

**Why this is a much smaller build than the previous plan:** no Supabase
tables needed, no Shopify API calls, no order data, no historical
tracking. Everything here is a live, on-demand read straight from Ubex.

---

## 1. The data model — grouping by product name

Confirmed directly from Ubex's own API sample responses
(`ubex-api.txt`): a single product with multiple sizes/colors is
represented as **multiple separate Ubex inventory records that share the
same `name`**, each with its own `size`, `color`, `barcode`, `sku`, and
`stock`:

```json
{ "name": "coffee mug", "size": "Medium [M]", "color": "yellow", "sku": "244135", "barcode": "...", "stock": "20" }
{ "name": "coffee mug", "size": "Large [L]",  "color": "yellow", "sku": "244136", "barcode": "...", "stock": "8"  }
```

So **"product" in this module = all Ubex items sharing an exact `name`
match.** Clicking a product shows the list of its variants (barcodes) and
each one's stock.

**Data-quality caveat, stated honestly:** this grouping is only as good as
Ubex's own naming consistency. Two genuinely different products that
happen to share an identical name string would get incorrectly grouped
together. This isn't a bug to engineer around — it's a reflection of
Ubex's own data — but worth knowing if a product's variant list ever looks
wrong; the fix in that case is in Ubex's product data, not this app's
logic.

---

## 2. Small data-layer addition — capture `size` / `color`

`lib/ubex/inventory.ts`'s `mapRow()` currently drops `size` and `color`
even though Ubex's raw response includes them:

```ts
// current
export type UbexInventoryItem = {
  id: string;
  name: string;
  barcode: string;
  stock: number;
  sku: string;
  trackQty: boolean;
};
```

Extend to:

```ts
export type UbexInventoryItem = {
  id: string;
  name: string;
  barcode: string;
  stock: number;
  sku: string;
  trackQty: boolean;
  size: string | null;   // ← new
  color: string | null;  // ← new
};
```

And in `mapRow()`, add:

```ts
size: (row.size ?? "").trim() || null,
color: (row.color ?? "").trim() || null,
```

This is the **only** change needed to existing Ubex code — everything else
this module needs (search, pagination, stock values) already exists or is
already planned in `stock-balance-rebuild-plan.md` Section 4.1
(`searchUbexInventory()`).

---

## 3. Grouping utility — `lib/ubex/group-by-name.ts` (new)

```ts
export type UbexProductGroup = {
  name: string;
  totalStock: number;
  variantCount: number;
  variants: UbexInventoryItem[];
};

export function groupUbexItemsByName(items: UbexInventoryItem[]): UbexProductGroup[] {
  const map = new Map<string, UbexInventoryItem[]>();
  for (const item of items) {
    const key = item.name.trim();
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return Array.from(map.entries()).map(([name, variants]) => ({
    name,
    totalStock: variants.reduce((sum, v) => sum + v.stock, 0),
    variantCount: variants.length,
    variants,
  }));
}
```

Pure function, no I/O — takes whatever Ubex items a search/page call
returns and groups them for display.

---

## 4. Search behavior

Reuses `searchUbexInventory()` (already planned in the Stock Balance
rebuild, Section 4.1) — no new Ubex-calling logic needed, just a new
consumer of it.

| Mode | Behavior |
|---|---|
| No search term | Load page 1, group by name, show as a list |
| Typing a search term | `?search=<term>&page=1`, group results by name |
| "Load more" | Increment page, append + re-group |

**Verify empirically once built:** Ubex's docs describe `search` as a
general text match ("Search item (example: coffee)") — confirm whether it
also matches against barcode/SKU, not just name, since staff may want to
search by scanning a barcode directly. If it doesn't, a direct barcode
lookup can fall back to `fetchUbexStockByIds()` if the barcode happens to
be searchable as an ID, or simply note that barcode-exact search isn't
supported server-side and rely on name/SKU search instead — don't build a
workaround before confirming there's actually a gap.

---

## 5. UI — one page, no dashboard needed

Unlike the previous plan, there's no time-series data here (Ubex stock is
a live snapshot, not historical), so **no charts, no KPI trend cards** —
just search and browse.

```
app/(shell)/ubex-inventory/page.tsx
```

```
┌─────────────────────────────────────────────────┐
│  🔍 Search product, SKU, or barcode…             │
├─────────────────────────────────────────────────┤
│  ▼ Sloane Maxi                    142 in stock   │
│    4 variants                                    │
│  ├───────────────────────────────────────────┤   │
│  │ Barcode 6291041234567 · M · Sand    36     │   │
│  │ Barcode 6291041234568 · L · Sand    40     │   │
│  │ Barcode 6291041234569 · M · Black   30     │   │
│  │ Barcode 6291041234570 · L · Black   36     │   │
│  └───────────────────────────────────────────┘   │
│                                                   │
│  ▶ Rowan Knit Top                  88 in stock   │
│    3 variants                                    │
│                                                   │
│  ▶ Cotton Poplin Shirt             54 in stock   │
│    2 variants                                    │
└─────────────────────────────────────────────────┘
```

- Same collapsible-card interaction already established for Stock
  Balance's Balance page — plain bordered card (`border-line bg-white`),
  **no glass** per `design-plan.md`'s rule for dense data screens
- Collapsed row: product name, total stock across all its variants,
  variant count
- Expanded: one row per variant — barcode, size/color (when present, omit
  the separator cleanly if either is blank), stock quantity in mono
  numerals (matching the app-wide convention for all quantities/IDs)
- SKU shown as a smaller muted subline per variant row if useful, or
  available via hover/title — your call, not essential to the core ask
- "Load more" button at the bottom for browsing without a search term,
  same pattern as Stock Balance's rebuild plan

### Optional small summary line above the search box

Not a dashboard — just a single line of context, e.g.:
*"1,240 products · 3,860 variants tracked"* — computed from whatever's
currently loaded (or from a lightweight full-count call if you want it
accurate independent of what's on screen; recommend keeping it scoped to
"currently loaded" to avoid re-introducing the slow full-catalog-fetch
problem this design is explicitly avoiding).

---

## 6. Module scaffold — `config/modules.ts`

```ts
export type ModuleId = "cod" | "fulfillment" | "stock" | "awb" | "subscriptions" | "ubexInventory";

export const UBEX_INVENTORY_ACCENT: ModuleAccent = {
  rail: "bg-ubex-inventory",
  labelText: "text-ubex-inventory",
  labelHover: "hover:bg-ubex-inventory-bg",
  activeBg: "bg-ubex-inventory-bg",
  activeText: "text-ubex-inventory",
  pillBg: "bg-ubex-inventory-bg",
  pillText: "text-ubex-inventory",
  mobileActive: "text-ubex-inventory",
  chartFill: "#4A6FA5",
  chartStroke: "#3A587F",
};

function ubexInventoryModule(): PortalModule {
  return {
    id: "ubexInventory",
    label: "Ubex Inventory",
    icon: Package, // lucide-react — distinct from stock module's Warehouse icon
    adminOnly: false, // pure lookup, no commitment/sales data — lower sensitivity than Stock Balance/Subscriptions; flag if you'd rather keep it admin-only
    accent: UBEX_INVENTORY_ACCENT,
    items: [
      { label: "Inventory", href: "/ubex-inventory", icon: Package },
    ],
  };
}
```

Reuses the same slate-blue accent color already chosen for the discarded
Stock Analysis module — the color choice itself was fine, only the
module's purpose changed. Add to `getPortalModules()`,
`modulePathPrefixes()`, and `MODULE_ROUTE_ENTRIES`, same pattern as every
other module.

**Single nav item** — no Dashboard/History/Settings sub-pages needed for
v1, since there's nothing to configure and nothing historical to review.
If that changes later (e.g. you want a "last synced" timestamp or a
manual refresh setting), add it then rather than speculatively now.

---

## 7. API route

```
app/api/ubex-inventory/search/route.ts
```

`GET /api/ubex-inventory/search?q=<term>&page=<n>` — thin wrapper:
1. Call `searchUbexInventory(q, page)` if `q` present, else
   `fetchUbexInventoryPage(page)`
2. Run `groupUbexItemsByName()` on the result
3. Return grouped products + pagination info

No auth gate stronger than whatever the rest of the shell already
requires (per the `adminOnly: false` suggestion above) — this is a
read-only lookup with no sensitive commitment/sales numbers attached.

---

## 8. What this deliberately does not include

- No Shopify calls, anywhere
- No Supabase tables, migrations, or persistence of any kind
- No "committed," "available," "can be sent" — those concepts don't apply
  here since there's no Shopify side being compared
- No charts, no time-series, no dashboard KPIs
- No sync/restock actions — purely a lookup tool

If any of that turns out to still be wanted later, it lives in Stock
Balance (sync/commitment) — this module stays intentionally minimal.

---

## 9. Suggested build order

1. Extend `UbexInventoryItem` + `mapRow()` — add `size`/`color`
2. `lib/ubex/group-by-name.ts` — grouping utility
3. `app/api/ubex-inventory/search/route.ts` — thin API wrapper
4. Module scaffold in `config/modules.ts` + Tailwind color tokens
5. `app/(shell)/ubex-inventory/page.tsx` + the collapsible card component
   — can reuse most of the visual/interaction pattern already being built
   for Stock Balance's card list, just simpler (no dual-store columns, no
   sync button, no confirm modal)