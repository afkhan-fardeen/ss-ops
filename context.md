# SS-OPS Codebase Context

Exploration report for planning new features (e.g. staff search by order number → UBEX AWB PDF preview).  
Generated from codebase review — no code changes were made.

---

## 1. UBEX / Logistechs Integration

### 1.1 Where we call the UBEX API

**Central HTTP client:** `lib/ubex/client.ts`

- Base URL: `UBEX_API_BASE_URL` env var, default `https://ubex-clients.apis.delivery`
- Auth: single `UBEX_API_TOKEN` passed as `?token=` query param (+ optional Bearer header)
- All UBEX calls go through `ubexFetch(path, init?)`

```typescript
// lib/ubex/client.ts
function baseUrl(): string {
  return (process.env.UBEX_API_BASE_URL ?? "https://ubex-clients.apis.delivery").replace(/\/$/, "");
}

export function getUbexToken(): string | null {
  const t = process.env.UBEX_API_TOKEN?.trim();
  return t ? t : null;
}

export async function ubexFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getUbexToken();
  // ...
  u.searchParams.set("token", token);
```

**Implemented Partner API endpoints (via `ubexFetch`):**

| File | Function | UBEX endpoint |
|------|----------|---------------|
| `lib/ubex/list-shipments.ts` | `fetchShipmentListPage` | `GET /api/v2/shipments/list?page={page}` |
| `lib/ubex/shipment-details.ts` | `fetchShipmentDetails` | `GET /api/shipments/details/{tracking}` |
| `lib/ubex/inventory.ts` | `fetchUbexInventoryPage` | `GET /api/v2/inventory?page={page}` |
| `lib/ubex/inventory.ts` | `fetchUbexStockByIds` | `GET /api/v2/inventory/get-stock?ids[]=…` |
| `app/api/ubex/ping/route.ts` | `GET` handler | `GET /api/meta/statuses` |

**Orchestration layer (calls the above):**

| File | Role |
|------|------|
| `lib/ubex/build-lookup.ts` | Paginates shipment list, fetches details, builds order↔tracking lookup map |
| `lib/cod/cod-list-data.ts` | COD list page data (Store 1) |
| `lib/store2/cod-list-data.ts` | COD list page data (Store 2) |
| `app/(shell)/fulfillment/page.tsx` | Fulfillment list page — builds lookup on load |
| `app/api/sync/auto-fulfill/route.ts` | Cron: poll Ubex details, auto-push Shopify fulfillments |
| `app/api/store2/sync/auto-fulfill/route.ts` | Same for Store 2 |
| `lib/stock/load-stock-balance-preview.ts` | Stock balance preview (inventory only) |
| `lib/stock/restock-to-ubex.ts` | Reads Ubex stock; writes Shopify only |

**Full API spec (reference only, not executed):** `ubex-api.txt`

---

### 1.2 Shipment creation

**Not implemented in application code.**

`POST /api/v2/shipments/create` is documented in `ubex-api.txt` (line ~550) but there are **no code references** to shipment creation anywhere in `lib/`, `app/api/`, or `components/`.

Current flow: **match existing Ubex shipments to Shopify orders** (list + details lookup), then push fulfillments **to Shopify**. The portal does not create shipments in Ubex.

---

### 1.3 How UBEX API token(s) are stored

**One global token via environment variable — not per store, not in DB.**

| Env var | Purpose |
|---------|---------|
| `UBEX_API_TOKEN` | **Required** — Partner API token |
| `UBEX_API_BASE_URL` | Optional override (default: `https://ubex-clients.apis.delivery`) |
| `UBEX_BEARER` | Set to `0` to disable Bearer header (query token only) |
| `UBEX_REQUEST_TIMEOUT_SECONDS` | Per-request timeout (default 25s) |
| `UBEX_MAX_ATTEMPTS` | Retry count (default 3) |
| `UBEX_MAX_LIST_PAGES` | Max shipment list pages during lookup |
| `UBEX_MAX_DETAIL_FETCHES` | Max detail fetches during lookup |
| `UBEX_DETAIL_CONCURRENCY` | Parallel detail fetch concurrency |
| `UBEX_LOOKUP_TTL_SECONDS` | In-memory lookup cache TTL |
| `UBEX_FULFILLED_STATUS` | Status string for auto-fulfill trigger (default `"Order Fulfilled"`) |
| `UBEX_TRACKING_URL_TEMPLATE` | UI/email tracking URL template (`{id}` placeholder) |
| `UBEX_EMAIL` | Fallback COD email recipient (not an API token) |

Template: `.env.example` lines 52–71.

**Multi-store note:** Store 1 and Store 2 share the **same** `UBEX_API_TOKEN`. Store scoping applies to Supabase rows (`store_id` on `order_ubex_links`, `fulfillment_log`), not separate Ubex credentials. There is no `UBEX_API_TOKEN_STORE2`.

---

### 1.4 Where UBEX tracking numbers are saved

**Yes — persisted in Supabase, keyed by Shopify order ID.**

#### Primary table: `order_ubex_links`

Migration: `supabase/migrations/004_order_ubex_links.sql`

```sql
create table if not exists order_ubex_links (
  shopify_order_id    bigint       primary key,
  shopify_order_name  text         not null,
  ubex_tracking       text         not null,
  last_ubex_status    text,
  auto_fulfilled_at   timestamptz,
  created_at          timestamptz  not null default now(),
  updated_at          timestamptz  not null default now()
);
```

Store scoping added in `supabase/migrations/010_store2.sql`:

```sql
alter table order_ubex_links
  add column if not exists store_id smallint not null default 1;
```

**Write path:** `lib/supabase/order-ubex-links.ts` → `upsertOrderUbexLinks()`

**Called from:**
- `app/(shell)/cod-list/page.tsx` (Store 1)
- `app/(shell)/fulfillment/page.tsx` (passes `storeId`)
- `lib/store2/cod-list-data.ts` (`{ storeId: 2 }`)

#### Secondary tables

| Table | Field | Purpose |
|-------|-------|---------|
| `ubex_cache` | `tracking`, `sender_barcode`, `tracking_url` | Cached Ubex shipment data for lookup fallback (`supabase/migrations/001_init.sql`) |
| `fulfillment_log` | `ubex_tracking` | Audit log when pushing tracking to Shopify (`lib/fulfillment/log.ts`) |
| `stock_restock_log` | `ubex_id` | Stock balance restock audit (Ubex inventory UUID, **not** shipment tracking) |

#### In-app model fields

- UI rows use `ubexId` (e.g. `lib/orders/build-order-rows.ts`, `lib/cod/build-rows.ts`)
- TypeScript: `OrderUbexLinksRow.ubex_tracking` in `lib/supabase/types.ts`

**Read fallbacks:** `lib/ubex/apply-row-fallbacks.ts` fills missing `ubexId` from `order_ubex_links`, then `ubex_cache`.

---

### 1.5 AWB, list, history endpoints

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/v2/shipments/list` | **Implemented** | `lib/ubex/list-shipments.ts` — used by `buildUbexLookup()` |
| `GET /api/shipments/details/{tracking}` | **Implemented** | `lib/ubex/shipment-details.ts` |
| `GET /api/shipments/awb/{tracking}` | **Not implemented** | Documented in `ubex-api.txt` line 1214 only |
| `GET /api/shipments/history/{tracking}` | **Not implemented** | Documented in `ubex-api.txt` line 1116 only |

**AWB API spec (from `ubex-api.txt`):**

```
GET /api/shipments/awb/{{SHIPMENT_TRACKING}}?token={{token}}&paper={{paper}}&orientation={{orientation}}

Return an AWB sticker as a PDF file (base64 encoded)
Sample Response: base64
```

No Next.js route, utility function, or `ubexFetch` call exists for AWB today.

**Related Next.js API routes (app layer):**

| Route | Role |
|-------|------|
| `app/api/ubex/ping/route.ts` | Health check via `/api/meta/statuses` |
| `app/api/sync/auto-fulfill/route.ts` | Cron: poll Ubex details, push Shopify fulfillments |
| `app/api/store2/sync/auto-fulfill/route.ts` | Same for Store 2 |
| `app/api/stock-balance/preview/route.ts` | Ubex inventory preview |
| `app/api/stock-balance/restock/route.ts` | Sync Shopify stock to match Ubex (no Ubex writes) |

---

## 2. Shopify Integration

### 2.1 Connected stores and how they are distinguished

**Up to 2 Shopify stores** (Store 2 is optional).

| Store | Label in UI | Env vars | DB discriminator |
|-------|-------------|----------|------------------|
| **Store 1** (main) | "Store 1 (BH)" | `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ADMIN_ACCESS_TOKEN`, `SHOPIFY_API_VERSION` | `store_id = 1`; cache table `shopify_orders_cache` |
| **Store 2** (optional) | "Store 2 (GCC)" | `SHOPIFY_STORE2_DOMAIN`, `SHOPIFY_STORE2_ACCESS_TOKEN`, `SHOPIFY_STORE2_API_VERSION` | `store_id = 2`; cache table `shopify_orders_cache_s2` |

Store 2 enabled when both `SHOPIFY_STORE2_DOMAIN` and `SHOPIFY_STORE2_ACCESS_TOKEN` are set:

```typescript
// lib/store2/client.ts
export function isStore2Configured(): boolean {
  return Boolean(process.env.SHOPIFY_STORE2_DOMAIN && process.env.SHOPIFY_STORE2_ACCESS_TOKEN);
}
```

**UI switching:** URL param `?store=1|2` (default `1`) via `components/portal/StoreSwitcherTabs.tsx`.

**Key Shopify env vars:** see `.env.example` lines 6–38.

**Store 2 cache note:** Separate table `shopify_orders_cache_s2` (not a `store_id` column on one table) avoids primary-key collisions when both stores share the same Shopify order ID integer space (`supabase/migrations/010_store2.sql`).

**Webhooks:** Only Store 1 has webhook registration (`app/api/admin/register-webhooks/route.ts`, `app/api/webhooks/shopify/[topic]/route.ts`). Store 2 cache is refreshed via live API fetch only.

---

### 2.2 Where Shopify order data is fetched/stored

**Hybrid: Supabase cache + live Shopify Admin API.**

| Store | Fetch logic | Cache table |
|-------|-------------|-------------|
| Store 1 | `lib/orders/fetch-orders.ts` | `shopify_orders_cache` |
| Store 2 | `lib/store2/fetch-orders.ts` | `shopify_orders_cache_s2` |

**Cache strategy** (default `prefer-cache`, 5 min freshness):

1. Prefer Supabase cache if fresh
2. Fallback to live `GET /admin/api/{version}/orders.json` (paginated, limit 250)
3. Background upsert into cache after live fetch

**Fields requested from Shopify:**

```typescript
// lib/orders/fetch-orders.ts
const FIELDS =
  "id,name,order_number,customer,shipping_address,total_price,currency,financial_status,fulfillment_status,gateway,payment_gateway_names,created_at";
```

**Additional cache layers:**

| Table | Store | Purpose |
|-------|-------|---------|
| `cod_list_day_cache` | Store 1 only | Per-day COD snapshot JSON to skip live fetches for past days |
| `order_ubex_links` | Both (`store_id`) | Shopify order ↔ Ubex tracking for auto-fulfill cron |

**There is no dedicated "orders" domain table** — orders live in cache tables as flattened Shopify JSON plus derived flags (`is_cod`, etc.).

---

### 2.3 Order object shape and tracking fields

#### Core Shopify type (minimal — no native tracking on order)

```typescript
// lib/shopify/types.ts
export type ShopifyOrder = {
  id: number;
  name: string;
  order_number?: number | null;
  total_price: string;
  currency: string;
  financial_status?: string | null;
  gateway?: string | null;
  payment_gateway_names?: string[];
  fulfillment_status?: string | null;
  created_at?: string | null;
  customer?: ShopifyCustomer | null;
  shipping_address?: ShopifyAddress | null;
};
```

**Shipment/tracking is NOT on `ShopifyOrder`.** It is layered at display time.

#### UI row types (Ubex tracking merged at build time)

**Fulfillment row** — `lib/orders/build-order-rows.ts`:

```typescript
export type OrderRow = {
  orderId: number;
  orderName: string;
  orderDate: string | null;
  ubexId: string;           // ← Ubex tracking number
  trackingUrl: string;
  isCod: boolean;
  paymentLabel: string;
  totalGbp: string;
  customerName: string;
  shippingAddress: string;
  shippingCountry: string;
  fulfillmentStatus: "fulfilled" | "partial" | "unfulfilled" | "unknown";
  financialStatus: string;
  alreadyFulfilled: boolean;
};
```

**COD row** — `lib/cod/build-rows.ts`:

```typescript
export type CodRow = {
  orderId: number;
  orderName: string;
  orderDate: string | null;
  ubexId: string;           // ← Ubex tracking number
  trackingUrl: string;
  // ... payment/amount fields
};
```

**Ubex matching** uses `order.name`, `order_number`, and `order.id`:

```typescript
// lib/ubex/lookup-helpers.ts (conceptual)
if (order.name) candidates.push(order.name);
if (order.order_number != null) {
  candidates.push(String(order.order_number));
  candidates.push(`#${order.order_number}`);
}
candidates.push(String(order.id));
```

**Fulfillment push to Shopify** — tracking goes in fulfillment payload:

```typescript
// lib/shopify/fulfill-order.ts
tracking_info: {
  company,
  number: trackingNumber,
  ...(input.trackingUrl ? { url: input.trackingUrl } : {}),
}
```

**To add shipment/tracking to the core order model:** you would extend `ShopifyOrder` or add a join type — today it lives only on `OrderRow`/`CodRow` and in `order_ubex_links`.

---

## 3. General App Structure

### 3.1 Tech stack

| Layer | Choice |
|-------|--------|
| Framework | **Next.js 14** (App Router, React Server Components) |
| Language | **TypeScript** + **React 18** |
| Styling | **Tailwind CSS** + Framer Motion |
| Database | **Supabase (Postgres)** via `@supabase/ssr` |
| Auth | Supabase Auth + shared-password mode (`lib/auth/`) |
| E-commerce | Shopify Admin REST API |
| Logistics | Ubex Partner API (Logistechs) |
| Excel export | `exceljs` |
| Email | `nodemailer` + `resend` |
| Hosting | Vercel (cron jobs for auto-fulfill) |

Source: `package.json`, `prd.md`, `.env.example`.

---

### 3.2 Backend routes convention

**Next.js Route Handlers** — one `route.ts` per folder under `app/api/`, named HTTP exports (`GET`, `POST`).

```
app/api/
├── auth/login, logout, callback
├── fulfill                          POST — push Shopify fulfillment (Store 1)
├── store2/fulfill                   POST — push fulfillment (Store 2)
├── sync/auto-fulfill                GET/POST — cron auto-fulfill (Store 1)
├── store2/sync/auto-fulfill         GET/POST — cron auto-fulfill (Store 2)
├── sync/trigger, sync/status
├── cod-list/download, cod-list/email
├── cod-settings, cod-email-log
├── stock-balance/preview, restock, history
├── ubex/ping
├── admin/register-webhooks
└── webhooks/shopify/[topic]
```

**To add a new API route:** create `app/api/<name>/route.ts` with exported `GET`/`POST`/etc. Use `requireSession()` or `requirePortalAdmin()` from `lib/auth/` for auth gates.

**Domain logic lives in `lib/`**, not in route handlers — routes should be thin wrappers.

---

### 3.3 Frontend structure

```
app/
├── page.tsx                         → redirect /dashboard
├── (auth)/login/page.tsx
├── (launcher)/dashboard/page.tsx    → module picker (home)
└── (shell)/                         → authenticated portal (Sidebar + Topbar)
    ├── cod/…                        → COD module
    ├── fulfillment/…              → Fulfillment module
    ├── stock-balance/…              → Stock module (admin-only)
    ├── admin/page.tsx
    └── account/page.tsx

components/   → UI by feature (cod-list, fulfillment, stock, portal, launcher)
config/       → modules.ts, navigation.ts
lib/          → domain logic
supabase/migrations/
```

**Module navigation** (`config/modules.ts`):

| Module | Routes |
|--------|--------|
| COD | `/cod/list`, `/cod/dashboard`, `/cod/history`, `/cod/settings` |
| Fulfillment | `/fulfillment/list`, `/fulfillment/dashboard`, `/fulfillment/history`, `/fulfillment/settings` |
| Stock balance (admin) | `/stock-balance/balance`, `/stock-balance/dashboard`, `/stock-balance/history`, `/stock-balance/settings` |
| Global | `/dashboard` (launcher), `/dashboard/analytics`, `/account`, `/admin` |

---

### 3.4 Order-related UI

| Feature | Page | Components |
|---------|------|------------|
| COD list | `app/(shell)/cod-list/page.tsx` | `CODListView`, `CODTable`, `CodListCollectionPanel` |
| Fulfillment queue | `app/(shell)/fulfillment/page.tsx` | `FulfillmentView`, `FulfillmentTable` |
| Fulfillment history | `app/(shell)/fulfillment/history/page.tsx` | `HistoryTable` |
| Stock balance | `app/(shell)/stock-balance/balance/page.tsx` | `StockBalanceView` (barcode search, not order number) |

Both COD and Fulfillment support Store 2 via `?store=2` tab switcher.

**There is no order detail page** — orders appear as rows in time-window tables. There is **no "search by order number"** feature today.

---

### 3.5 Where a "search by order number" feature might fit

| Location | Fit | Notes |
|----------|-----|-------|
| **`/fulfillment/list`** | **Best** | Primary order table; shows `orderName`, Ubex ID, push status |
| **`/cod/list`** | Good | Same order rows for COD; date-picker driven today |
| **Topbar** (`components/portal/Topbar.tsx`) | Good | Global "jump to order" across modules |
| **`/admin`** | Possible | Currently only user count — room for ops tools |
| New dedicated route | Possible | e.g. `/fulfillment/lookup` or `/tools/awb` |

**Gap:** No single-order Shopify fetch exists today — only window-based `fetchOrders()`. A search feature would need either:
- Query `order_ubex_links` by `shopify_order_name` (if previously matched), or
- New Shopify Admin API call: `GET /admin/api/{version}/orders.json?name={orderName}` or by ID

---

## 4. Summary

### 4.1 Current order → shipment → UBEX flow (end-to-end)

```
1. ORDER INGESTION
   Shopify order created
   → Webhook (Store 1 only): app/api/webhooks/shopify/[topic]/route.ts
   → Cached in shopify_orders_cache / shopify_orders_cache_s2

2. PORTAL PAGE LOAD (COD list or Fulfillment list)
   → fetchOrders() by time window (cache-first, then live Shopify API)
   → buildUbexLookup(): paginate GET /api/v2/shipments/list, fetch details
   → Match order.name / order_number / id (last-4 fallback) → ubex tracking
   → buildOrderRows() / buildCodRows() attach ubexId + trackingUrl to each row
   → applyUbexRowFallbacks() from order_ubex_links + ubex_cache if live lookup misses
   → upsertOrderUbexLinks() persists matches for cron

3. MANUAL FULFILLMENT (staff)
   Staff clicks Push on Fulfillment list
   → POST /api/fulfill { orderId, trackingNumber, trackingUrl }
   → createFulfillment() → Shopify REST /fulfillments.json with tracking_info
   → fulfillment_log + push_idempotency audit rows

4. AUTO FULFILLMENT (cron)
   POST /api/sync/auto-fulfill
   → Read pending order_ubex_links (auto_fulfilled_at IS NULL)
   → fetchShipmentDetails(ubex_tracking) for each
   → When status = UBEX_FULFILLED_STATUS ("Order Fulfilled"), push to Shopify
   → Mark auto_fulfilled_at on order_ubex_links

5. COD PARALLEL PATH
   Same Ubex matching on COD list
   → Used for Excel export + email to Ubex (not Shopify fulfillment push)
```

**Important:** The portal **does not create Ubex shipments**. It discovers existing Ubex shipments and links them to Shopify orders, then pushes tracking back to Shopify.

---

### 4.2 Gaps for "staff enter order number → UBEX AWB PDF preview"

| Requirement | Current state | Blocker? |
|-------------|---------------|----------|
| Resolve order number → Ubex tracking | Partially exists via `order_ubex_links.shopify_order_name` + live lookup helpers | **Soft gap** — works if order was previously loaded in a time window and matched; no on-demand single-order lookup API |
| Fetch AWB PDF from Ubex | **Not implemented** | **Hard gap** — `GET /api/shipments/awb/{tracking}` documented in `ubex-api.txt` only; need new `lib/ubex/fetch-awb.ts` + API route |
| Store AWB PDF locally | Not implemented | Optional — could proxy/stream from Ubex without persisting |
| UI to enter order number | **Not implemented** | Need new search input + result/preview panel |
| Single-order Shopify fetch | **Not implemented** | Need new utility if order isn't in cache/links |
| Tracking saved in DB | **Yes** — `order_ubex_links.ubex_tracking` | Not a blocker for orders already matched |
| Per-store Ubex token | **No** — one global `UBEX_API_TOKEN` | Not a blocker unless stores need separate Ubex accounts |

**Recommended build path for AWB preview feature:**

1. **New API route** e.g. `GET /api/orders/lookup?orderName=#1234&store=1`
   - Look up `order_ubex_links` by `shopify_order_name`
   - Fallback: fetch single order from Shopify + run `ubexTrackingForShopifyOrder()`
2. **New UBEX utility** e.g. `lib/ubex/fetch-awb.ts`
   - `ubexFetch('/api/shipments/awb/{tracking}?paper=...&orientation=...')`
   - Decode base64 → PDF buffer
3. **New API route** e.g. `GET /api/ubex/awb/{tracking}` — proxy PDF to frontend
4. **UI** — search input on Fulfillment list or Topbar; iframe/embed or download link for PDF preview

---

## 5. Key file index

| Area | Path |
|------|------|
| UBEX HTTP client | `lib/ubex/client.ts` |
| UBEX shipment list | `lib/ubex/list-shipments.ts` |
| UBEX shipment details | `lib/ubex/shipment-details.ts` |
| UBEX order↔tracking lookup | `lib/ubex/build-lookup.ts`, `lib/ubex/lookup-helpers.ts` |
| UBEX API spec (reference) | `ubex-api.txt` |
| Order↔Ubex link persistence | `lib/supabase/order-ubex-links.ts` |
| Shopify order fetch | `lib/orders/fetch-orders.ts`, `lib/store2/fetch-orders.ts` |
| Shopify order type | `lib/shopify/types.ts` |
| UI order row builder | `lib/orders/build-order-rows.ts` |
| Shopify fulfillment push | `lib/shopify/fulfill-order.ts` |
| Fulfill API | `app/api/fulfill/route.ts` |
| Auto-fulfill cron | `app/api/sync/auto-fulfill/route.ts` |
| Fulfillment UI | `app/(shell)/fulfillment/page.tsx`, `components/fulfillment/` |
| COD UI | `app/(shell)/cod-list/page.tsx`, `components/cod-list/` |
| Module/route config | `config/modules.ts` |
| Env template | `.env.example` |
| DB migrations | `supabase/migrations/` |
