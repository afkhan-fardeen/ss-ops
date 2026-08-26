# Zoho Books Module — Barcode Sync — Implementation & Ops Guide

**Status:** Implemented (v2 barcode sync — numeric `customfield_id` + dedicated
customfields endpoint). Manual ops still required before first use: OAuth
`settings.*` scopes, correct `ZOHO_ORG_ID`, and `ZOHO_UBEX_BARCODE_CF_ID`.

**Scope of this file:** the barcode-backfill tool only. The later
inventory-adjustment sync (Ubex → Zoho stock quantities) is a separate,
future piece — this module is built to hold that too eventually, but v1 is
barcode-filling only.

**What this does:** finds Zoho items whose "Ubex Barcode" custom field
(added per your earlier setup — not mandatory, hidden from transactions)
is empty, proposes a barcode for each by matching Zoho's SKU against
Shopify's SKU (confirmed identical across Zoho and Shopify), and lets you
manually review and select which ones to actually write — nothing gets
filled without an explicit click.

**Route:** `/zoho-books/barcode-sync` (module id: `zohoBooks`, admin-only +
explicit grant).

---

## 1. Why manual selection, not auto-fill-everything

Even though SKU matching is reliable when it's clean, three things can go
wrong that a human should see before anything gets written to Zoho:

- **International Store and Seissense GCC Store disagree** on the barcode
  for the same SKU — a real data inconsistency worth knowing about, not
  something to silently resolve by picking one
- **No Shopify match at all** — could mean a typo'd SKU, a discontinued
  item, or a Zoho item that was never supposed to be tracked against Ubex
  in the first place
- **This writes to your accounting system.** Even though a barcode field
  itself isn't a financial number, mistakes here would corrupt the very
  join key the later stock-adjustment sync depends on — worth a human
  glance before committing, especially the first time this runs

---

## 2. Matching logic

```
For each Zoho item where "Ubex Barcode" is empty:
  Look up its SKU in International Store's Shopify variants
  Look up its SKU in Seissense GCC Store's Shopify variants

  Both found, barcodes match     → status: "clean"    → proposed = that barcode
  Both found, barcodes differ    → status: "conflict"  → show both, propose nothing
  Found in exactly one store     → status: "clean"     → propose that store's barcode
  Found in neither store         → status: "no-match"  → propose nothing
```

**Never touches items that already have a value in the barcode field** —
this tool only looks at empty ones, so nothing manually corrected earlier
can get overwritten by a re-scan.

---

## 3. Data layer (shipped)

### 3.0 `lib/zoho/barcode-field.ts`

Zoho Books item custom fields are identified by a numeric **`customfield_id`**
(e.g. `46000000012845`) — separate from the human-readable label ("Ubex
Barcode" / "UBEX BARCODE"). **Books writes require `customfield_id`**, not
`api_name` (that convention is Zoho Inventory).

- `getUbexBarcodeFieldId()` — reads `ZOHO_UBEX_BARCODE_CF_ID` from env
- `requireUbexBarcodeFieldId()` — throws if unset
- `readUbexBarcodeFromItem(customFields, fieldId)` — reads value by matching
  `customfield_id` or `field_id` on each entry
- **Empty fields are omitted** from item list/get payloads — if no matching
  entry exists, the field is treated as unfilled

Discover the numeric ID once via `scripts/zoho-discover-barcode-field.ts`
(Section 11), which calls `GET /books/v3/settings/fields?entity=item`.

### 3.1 `lib/zoho/list-items-missing-barcode.ts`

```ts
export type ZohoItemRow = { itemId: string; name: string; sku: string };

export type ListZohoItemsResult =
  | { ok: true; items: ZohoItemRow[] }
  | { ok: false; error: ZohoErrorResult };

export async function listZohoItemsMissingBarcode(): Promise<ListZohoItemsResult>
```

- Pre-checks `isZohoConfigured()` and `ZOHO_UBEX_BARCODE_CF_ID`
- Paginates `GET /books/v3/items?organization_id=...&page={n}&per_page=200`
- For each item, inspects `custom_fields`:
  - **No entry** with matching `customfield_id` → include (Zoho omits empty fields)
  - Entry exists with non-empty `value` → skip
  - Entry exists with empty `value` → include
- Skips items with empty SKU
- Uses `parseZohoErrorResponse()` + `classifyZohoResponse()` on failures

### 3.1b `lib/zoho/fetch-item-custom-field-definitions.ts`

```ts
export async function fetchItemCustomFieldDefinitions(): Promise<FetchItemFieldDefinitionsResult>
```

Wraps `GET /books/v3/settings/fields?entity=item` (falls back to
`settings/customfields` when the Books role denies Item entity on
`settings/fields`) for discovery script, permissions check, and optional
field-ID validation.

### 3.2 `lib/zoho/match-barcode-candidates.ts`

```ts
export async function findBarcodeMatchCandidates(): Promise<FindBarcodeMatchResult>
```

`FindBarcodeMatchResult` on success includes `candidates`, `summary`
(`total`, `clean`, `conflict`, `noMatch`), and `store2Configured`.

Shopify lookup uses **`fetchShopifySkuBarcodeMap(locationId, storeId)`**
in `lib/shopify/inventory-read.ts` — a SKU → barcode map built by
paginating all variants. This is **not** the barcode-keyed catalog helper
used by Stock Balance / Ubex join; that helper is unchanged.

**Full-catalog operation, on-demand only** — triggered by explicit Scan
click in the UI, not on page load.

### 3.3 `lib/zoho/update-item-barcode.ts`

```ts
export async function updateZohoItemBarcode(
  itemId: string,
  barcode: string,
): Promise<{ ok: true } | { ok: false; error: ZohoErrorResult }>
```

**Dedicated customfields endpoint** (singular `item`, not `items`):

```
PUT /books/v3/item/{itemId}/customfields?organization_id=...
```

Body:

```json
{ "custom_fields": [{ "customfield_id": "<ZOHO_UBEX_BARCODE_CF_ID>", "value": "6291041234567" }] }
```

Do **not** use `PUT /books/v3/items/{id}` with `api_name` — that is the
Inventory-style pattern and fails on Books (often Zoho code `104003`).

### 3.4 `lib/zoho/classify-error.ts`

Shared error classifier for this module — see Section 9.

---

## 4. API routes (shipped)

```
GET  /api/zoho-books/barcode-candidates   → findBarcodeMatchCandidates()
POST /api/zoho-books/barcode-fill         → { itemIds: string[] }
```

Both require `requireModuleAccess("zohoBooks")`. Scan route:
`maxDuration = 120`.

**GET success:**
```json
{ "ok": true, "candidates": [...], "summary": { "total", "clean", "conflict", "noMatch" }, "store2Configured": true }
```

**GET failure:** `{ "ok": false, "error": ZohoErrorResult }`

**POST:** validates item IDs against a fresh scan; only `clean` rows with
a proposed barcode are written. Loops sequentially in chunks of 15.
Returns `{ "ok": true, "results": [{ "itemId", "ok", "error?" }] }`.

---

## 5. UI (shipped)

**Page:** `app/(shell)/zoho-books/barcode-sync/page.tsx`  
**Client:** `components/zoho-books/BarcodeSyncView.tsx`  
**Errors:** `components/zoho-books/ZohoErrorDisplay.tsx`

```
┌──────────────────────────────────────────────────────────┐
│  Zoho Barcode Sync                                        │
│  Fill the "Ubex Barcode" field on Zoho items using        │
│  matching Shopify SKUs.                                   │
│                                                            │
│  [ Scan for items to fill ]                                │
├──────────────────────────────────────────────────────────┤
│  Found 34 items · 22 clean · 8 conflicts · 4 no match      │
│                                                            │
│  [ Select all clean matches ]      [ Fill selected (12) ]  │
│                                                            │
│  ☑ Sloane Maxi        SKU 244135   → 6291041234567        │
│  ☐ Cotton Poplin      SKU 244310   ⚠ Intl / GCC disagree: │
│                                       ...551122 / ...551199 │
│  ☐ Aria Blazer        SKU 244400   ⚠ No Shopify match     │
└──────────────────────────────────────────────────────────┘
```

- **Nothing loads on page visit** — Scan is the only trigger for the
  expensive full-catalog match
- Only `status: "clean"` rows get checkboxes
- **Select all clean matches** + **Fill selected (N)** — selecting is not
  writing; Fill is the only Zoho write action
- Per-row ✓ or error after fill; page-level banner for blocking errors
  (Section 9.3)
- Conflict rows use `STORE_LABELS` from `lib/stores/labels.ts`
  (International Store / Seissense GCC Store)
- Layout: `max-w-7xl` (matches Ubex Inventory)

---

## 6. Module scaffold (shipped)

Registered in `config/modules.ts` as `zohoBooks`:

- Nav: **Barcode Sync** → `/zoho-books/barcode-sync`
- Accent: `#8A6D3B` (`zoho-books` Tailwind token)
- `adminOnly: true`; also in `needsExplicitGrant` (`can-access-module.ts`)
- Admin user editor + launcher card include `zohoBooks`

**AWB invoice lookup** stays on `/awb` + `/api/invoice` — not moved under
this module.

When inventory-adjustment sync is built later, it adds a second nav item
under the same module (e.g. "Stock Sync") rather than a new top-level
module.

---

## 7. OAuth scopes

**Correction, confirmed against Zoho's Items API docs:** Item endpoints use
`ZohoBooks.settings.*`, **not** `ZohoBooks.items.*`. Token refresh may
list `items.READ/UPDATE` but those scopes do **not** authorize the Items
API — only `settings.*` works.

**Barcode Sync v1 requires:**
```
ZohoBooks.settings.READ
ZohoBooks.settings.UPDATE
```

**Also keep for AWB (existing):**
```
ZohoBooks.invoices.READ
```

**Not needed yet:** `ZohoBooks.inventoryadjustments.CREATE` (future stock
sync).

After re-authorizing: update `ZOHO_REFRESH_TOKEN` in Vercel **and** local
`.env`.

---

## 8. What v1 deliberately does not include

- No Supabase table — fully live/on-demand
- No audit log of who filled what/when
- No inventory-adjustment posting — next module feature
- No automatic re-scanning — always an explicit button click

---

## 9. Error handling (shipped)

Module functions check `res.ok` via `parseZohoErrorResponse()` before
assuming success JSON. `lib/zoho/fetch-invoice.ts` (AWB) still uses its
own simpler path — intentional.

### 9.1 `lib/zoho/classify-error.ts`

```ts
export type ZohoErrorCategory = "not_configured" | "auth_expired" | ...;
export type ZohoErrorResult = { category; userMessage; detail; httpStatus? };
export function classifyZohoError(status: number, body: unknown): ZohoErrorResult
export async function parseZohoErrorResponse(res: Response): Promise<ParsedZohoResponse>
```

`not_configured` also covers missing `ZOHO_UBEX_BARCODE_CF_ID`.

`lib/zoho/client.ts` token refresh surfaces Zoho's `error_description`
(e.g. rate-limit text).

### 9.2 Categories and user-facing messages

| Category | Trigger | User-facing message |
|---|---|---|
| `not_configured` | Missing Zoho creds or `ZOHO_UBEX_BARCODE_CF_ID` | *"Zoho isn't connected…"* / *"Ubex Barcode custom field isn't configured…"* |
| `auth_expired` | Token refresh fails (`invalid_grant`, etc.) | *"Zoho's connection has expired… re-authorized"* |
| `insufficient_scope` | HTTP 401/403, or Zoho code **104003** (Books role can't edit items) | *"Re-authorize with `settings.READ/UPDATE`"* / *"OAuth scopes look fine but this Books user role can't edit items…"* |
| `org_mismatch` | Organization not found for this connection | *"Check `ZOHO_ORG_ID` in Vercel."* |
| `rate_limited` | HTTP 429 | *"Wait a minute and try again"* |
| `network` | Timeout / connection failure | *"Couldn't reach Zoho…"* |
| `zoho_outage` | HTTP 5xx from Zoho | *"Zoho's API is having trouble…"* |
| `item_not_found` | HTTP 404 on PUT | *"Item no longer exists… Re-scan"* |
| `field_missing` | Custom field ID not recognized | *"Check `ZOHO_UBEX_BARCODE_CF_ID` and Field Customization in Zoho Settings"* |
| `unknown` | Anything else | Raw Zoho `message`/`code` in technical detail |

**Note on 104003:** If you still see this after switching to the
`/item/{id}/customfields` endpoint and numeric ID, OAuth scopes are likely
fine — the Zoho Books **user role** for the account that authorized the app
probably cannot edit items. Fix under Settings → Users & Roles in Zoho Books.

### 9.3 Where errors show in the UI

**Page-level banner** (blocks feature): `not_configured`, `auth_expired`,
`insufficient_scope`, `org_mismatch`, `zoho_outage`, `network` on initial
scan.

**Per-row** (after Fill): `rate_limited`, `item_not_found`, `field_missing`,
`network`/`zoho_outage` mid-batch, `unknown`.

Every error has a collapsible **Technical detail** toggle (HTTP status +
raw Zoho body).

---

## 10. Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `ZOHO_CLIENT_ID` | yes | OAuth app |
| `ZOHO_CLIENT_SECRET` | yes | OAuth app |
| `ZOHO_REFRESH_TOKEN` | yes | Offline access |
| `ZOHO_ORG_ID` | yes | Books org ID (Settings → Organization Profile) |
| `ZOHO_UBEX_BARCODE_CF_ID` | yes for scan/fill | Numeric `customfield_id` for Ubex Barcode |
| `ZOHO_BASE_URL` | optional | Data center API base (default US) |
| `ZOHO_ACCOUNTS_URL` | optional | OAuth token URL (default US) |
| `ZOHO_REQUEST_TIMEOUT_SECONDS` | optional | Default 20 |

See `.env.example` for placeholders.

---

## 11. Ops / verification scripts

**Do not run both scripts back-to-back** — Zoho rate-limits
`/oauth/v2/token` ("too many requests continuously"). Wait 5–10 minutes
between attempts if rate-limited; run **one script only** per try.

```
OAuth + ZOHO_ORG_ID in env
        ↓
zoho-discover-barcode-field.ts  →  set ZOHO_UBEX_BARCODE_CF_ID
        ↓
zoho-check-permissions.ts       →  validate READ + UPDATE
        ↓
Deploy env to Vercel + smoke test UI
```

### 11.1 `scripts/zoho-discover-barcode-field.ts`

**When:** First, after `ZohoBooks.settings.READ` is on the token.

**Run:**
```bash
npx tsx scripts/zoho-discover-barcode-field.ts
npx tsx scripts/zoho-discover-barcode-field.ts "Exact Label Here"
```

Default label: `"Ubex Barcode"` (matches live label `UBEX BARCODE`
case-insensitively). Calls `GET /books/v3/settings/fields?entity=item` and
prints copy-paste line:
```
ZOHO_UBEX_BARCODE_CF_ID=<numeric customfield_id>
```

**Why not discover from a sample item?** Empty custom fields are omitted
from item payloads — item-based discovery misses unfilled fields and only
shows `api_name`, which Books writes do not accept.

**If list fails:** token may only have `invoices.READ` (AWB setup) — add
`settings.READ` and re-auth (Section 7).

### 11.2 `scripts/zoho-check-permissions.ts`

**When:** After `ZOHO_UBEX_BARCODE_CF_ID` is set.

**Run:**
```bash
npx tsx scripts/zoho-check-permissions.ts
```

Confirms token refresh, field ID via `settings/fields`, `settings.READ`
(list + get item), and `settings.UPDATE` (noop PUT to
`/books/v3/item/{id}/customfields` with same field value — same endpoint
as production). Also lists field definitions if CF env is still missing.

### 11.3 Known ops pitfalls

- **Wrong org ID:** Invoices may work while items fail, or vice versa —
  use Organization ID from Books settings for the OAuth user
- **Code 57 on items with `items.*` scopes on token:** Re-auth with
  `settings.READ/UPDATE`, not `items.READ/UPDATE`
- **Code 104003 on UPDATE:** Wrong endpoint/key (fixed in v2) **or** Books
  user role can't edit items even with correct OAuth scopes
- **Rate limit on token refresh:** Wait, then run one script once

---

## 12. Implementation status

### Shipped

- `lib/zoho/classify-error.ts`, `barcode-field.ts`, `fetch-item-custom-field-definitions.ts`, list/match/update libs
- `fetchShopifySkuBarcodeMap()` in `lib/shopify/inventory-read.ts`
- API routes + `BarcodeSyncView` UI + `zohoBooks` module scaffold
- Ops scripts (v2 discovery via `settings/fields` + permissions check)
- **Barcode Compare** (read-only): `/zoho-books/barcode-compare` — Zoho Ubex Barcode custom field vs Ubex catalog barcode (`ubex_inventory_cache`). Refresh Ubex separately; Compare does not live-pull Ubex or Shopify. No writes.

### Remaining manual (before first production use)

1. Re-auth OAuth with `settings.READ/UPDATE` + keep `invoices.READ`
   (Section 7)
2. Set correct `ZOHO_ORG_ID`
3. `npx tsx scripts/zoho-discover-barcode-field.ts` → set
   `ZOHO_UBEX_BARCODE_CF_ID` (replace any old `ZOHO_UBEX_BARCODE_CF`)
4. `npx tsx scripts/zoho-check-permissions.ts`
5. Deploy all `ZOHO_*` vars to Vercel
6. Grant `zohoBooks` module to intended users (admin or explicit grant)
7. Smoke test: open `/zoho-books/barcode-sync` → Scan → select clean rows
   → Fill selected
