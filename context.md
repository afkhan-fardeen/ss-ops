# SS-OPS — Codebase Context

Single-file orientation for the Seissense Ops Portal. Read this first instead of re-exploring the repo.
Last verified against `main` @ `b20b2d1` + the uncommitted Oct-2026 changes below (COD removal, cron hold, new UI). If code and this file disagree, the code wins — then fix this file.

---

> **Current state (Oct 2026):** the **COD module and FX/Excel COD export were removed**. **Scheduled cron is on hold** (`vercel.json` is `{}`); orders are pushed manually with the Push button. The UI was re-themed to a neutral slate + single indigo accent admin look (Inter font; tokens in `tailwind.config.ts`: `canvas, ink, muted, line, primary, primary-soft`). The old "launcher" no longer exists — `/dashboard` is an Overview page inside the shell. Sections below that still mention COD/cron/launcher/glass describe the previous state; the bullet list here wins.
> Also changed: cron routes fail closed (`lib/auth/verify-cron.ts`), `requirePortalAdmin()` added, recipients API moved to `/api/settings/recipients` (admin, or Sales Report module for `sales_report_emails`), open-redirect fix in `safe-next-path.ts`, cancelled orders excluded in `fetchOrdersForStore`, security headers + legacy `/cod*` redirects in `next.config.mjs`, `lib/datetime/collection-window.ts` → `bahrain-time.ts`, `lib/shopify/fetch-cod-orders.ts` → `order-utils.ts`. `isCod` stays as a payment label/filter in the Fulfillment queue.

## 1. What this is

Internal operations portal for **Seissense** (activewear brand, Bahrain-based). Staff use it to run the daily e-commerce ops loop between **Shopify** (two stores), **Ubex/Logistechs** (3PL + COD courier, warehouse stock), **Supabase** (state/cache/auth) and **Zoho Books** (invoices).

Started as a COD-list generator (see `docs/prd.md`, now historical) and grew into a multi-module portal. `docs/prd.md` is outdated in places (says Resend, "no auth", Store 1 COD) — don't trust it over the code.

### The two Shopify stores
| id | Label (`lib/stores/labels.ts`) | Currency | Notes |
|---|---|---|---|
| 1 | International Store | GBP | env `SHOPIFY_*` |
| 2 | Seissense GCC Store | AED | env `SHOPIFY_STORE2_*`; optional (`isStore2Configured()`) |

In the Stock UI these appear as **Store A (=1)** and **Store B (=2)**. Both stores draw from **one shared Ubex warehouse pool**.

---

## 2. Stack & commands

Next.js **14** App Router · React 18 · TypeScript · Tailwind 3 · Framer Motion · Recharts · Sonner (toasts) · lucide-react · Supabase (`@supabase/ssr` + `supabase-js`) · `exceljs` (xlsx) · `pdf-lib` · `nodemailer` (Gmail SMTP). Deployed on **Vercel**. Path alias `@/*` → repo root. No test suite.

```
npm run dev | build | start | lint
npm run db:push                       # tsx scripts/apply-migrations.ts  (needs SUPABASE_DB_URL; migrations are idempotent)
npm run db:verify                     # scripts/verify-supabase.ts
npm run db:backfill-orders            # scripts/backfill-orders-cache.ts
npm run db:clear-stuck-idempotency    # scripts/clear-stuck-idempotency.ts
npm run db:purge-bad-tracking-urls    # scripts/purge-bad-tracking-urls.ts
npx tsc --noEmit                      # typecheck (only pre-allowed command in .claude/settings.local.json)
```

`.env` is gitignored; `.env.example` is the template (see §10 for drift between them).

---

## 3. Directory map

```
app/
  (auth)/            login, public /subscriptions/request form
  (launcher)/dashboard/   launcher home (no sidebar; TechBackground)
  (shell)/           everything else: Sidebar + Topbar + CommandPalette shell
  (reports)/sales-report/ standalone public report page
  api/               route handlers (see §8)
components/          by feature: portal/ (shell), cod-list/, fulfillment/, stock/, ubex-inventory/,
                     subscriptions/, dashboard/, launcher/, ui/, motion/ …
config/modules.ts    SOURCE OF TRUTH for modules, nav items, accents, route titles, path→module map
config/navigation.ts settings nav (Account / Admin) — small, partly deprecated types
hooks/               useRowPushQueue (bulk fulfill), useRestockQueue/Status, useStockBalancePreview, useUrlViewState
lib/                 all business logic (see §6)
supabase/migrations/ 001–019 .sql (idempotent)
scripts/             one-off ops scripts run via tsx
docs/                prd.md (historical), design-plan.md (design system), ubex-api.txt (2k-line Ubex API reference)
assets/subscriptions/template.pdf   PDF form filled by lib/subscriptions/fill-pdf.ts
vercel.json          cron schedule
middleware.ts        auth gate (see §4)
```

Many `(shell)` pages are **re-exports** of a canonical page to support legacy + new URLs, e.g. `cod/list/page.tsx` → `cod-list/page.tsx`, `fulfillment/list` → `fulfillment/page`, `stock-balance/balance` → `stock-balance/page`. Edit the canonical one. Legacy paths are kept as `aliases` in `config/modules.ts`.

---

## 4. Auth, roles, module access

**Two auth modes** (`lib/auth/mode.ts`, `AUTH_PROVIDER` env): `supabase` (default whenever `NEXT_PUBLIC_SUPABASE_URL` is set) or legacy `shared` (single `PORTAL_PASSWORD` + HMAC `SESSION_SECRET` cookie `ss_portal_session`). Production = Supabase.

**`middleware.ts`** gates everything except:
- prefixes: `/login`, `/subscriptions/request`, `/api/auth/{login,logout,callback}`, `/api/webhooks`, `/api/subscriptions/request`, **`/api/sync`** (cron routes — these must self-auth)
- exact paths: `/sales-report`, `/api/sales-report/download` (public emailed report link; `/sales-report/settings` stays protected — that's why it's exact-match)
- Unauthed `/api/*` → 401 JSON; pages → redirect `/login?next=…`.

**Roles / access** (`profiles` table: `role`, `allowed_modules text[] | null`):
- `lib/auth/require-session.ts` → `requireSession()` (throws if unauthenticated)
- `lib/auth/is-portal-admin.ts` → `profiles.role = 'admin'` (shared-password sessions are never admin)
- `lib/auth/can-access-module.ts` → `canAccessModule(id)` / `requireModuleAccess(id)` (throws `PortalAuthError` 401/403)
- `lib/auth/get-visible-modules.ts` → what shows on launcher/sidebar

Rules: admins see everything. Members with `allowed_modules = null` see only **cod, fulfillment, awb**. Modules needing an **explicit grant** (or admin): `stock, stockAnalysis, ubexInventory, subscriptions, zohoBooks, salesReport, stockAlerts` (`needsExplicitGrant`, duplicated in `get-visible-modules.ts` — keep both in sync when adding a module). Members with an array see only listed ids.

Page pattern: server component calls `canAccessModule(id)` → renders `<ModuleAccessDenied/>`. API pattern: `requireModuleAccess(id)` in try/catch → map `PortalAuthError` to its status. Admin-only API routes use `requirePortalAdmin` / `requireSession` + admin check.

Writes to Supabase use the **service-role client** (`lib/supabase/service.ts` → `getSupabaseService()`, returns `null` if unconfigured — callers must handle null). RLS is enabled on tables; service role bypasses it. Never import the service client in client components.

---

## 5. Modules (`config/modules.ts`)

`ModuleId`: `cod | fulfillment | stock | awb | subscriptions | stockAnalysis | ubexInventory | zohoBooks | salesReport | stockAlerts`.

| Module | Routes | Access | What it does |
|---|---|---|---|
| **COD** | `/cod/{dashboard,list,history,settings}` (+legacy `/cod-*`) | default | Daily COD list for **Store 2 only**: orders in collection window → AED amounts → xlsx download / email to Ubex. History = email log. Settings = recipients. |
| **Fulfillment** | `/fulfillment/{dashboard,list,history,settings}` (+`/history`) | default | Unfulfilled orders matched to Ubex tracking; push fulfillment (+tracking URL) to Shopify, per row or bulk. `?store=1\|2` switches store. |
| **AWB Lookup** | `/awb` | default | Order # → Ubex tracking → AWB PDF URL (+ Zoho invoice PDF). |
| **Stock balance** | `/stock-balance/{dashboard,balance,errors,history,settings}` | grant | Compare Ubex stock vs both Shopify stores; "restock" writes Shopify `on_hand` from Ubex. Daily mismatch-review workflow. |
| **Stock analysis** | `/stock-analysis/{dashboard,trends}` | grant | Commitment (committed vs Ubex stock) + sales aggregates; per-product search. |
| **Ubex Inventory** | `/ubex-inventory` | grant | Read-only grouped warehouse stock + per-store committed; full catalog `.xlsx` export with live progress bar/ETA. |
| **Stock Alerts** | `/stock-alerts` | grant | Velocity-based low-stock/stockout scan (14-day sales window). |
| **Subscriptions** | `/subscriptions{,/dashboard,/active,/[id]}` | grant | Internal expense-approval workflow: public request form → admin approve/reject → filled PDF form. |
| **Zoho Books** | `/zoho-books` | grant | Currently no nav items; Zoho code mainly powers invoice lookup in AWB. |
| **Sales Report** | `/sales-report` (public), `/sales-report/settings` | grant | Daily sales summary for both stores; emailed with xlsx; recipients in settings. |
| Global | `/dashboard` (launcher), `/dashboard/analytics`, `/account`, `/admin`, `/admin/health` | auth / admin | Launcher, user mgmt (create users, set `allowed_modules`), system health, webhook registration. |

Colour/identity: modules are grouped into 3 **domain colours** (Orders = teal `#2F9E7F`, Inventory = olive `#6B8A3E`, Finance = purple `#6B4FA2`). Tokens in `tailwind.config.ts`; per-module `ModuleAccent` objects in `config/modules.ts`.

**Adding a module** → touch: `ModuleId` union + `xxxModule()` + `getPortalModules` + `modulePathPrefixes` + `MODULE_ROUTE_ENTRIES` in `config/modules.ts`; `needsExplicitGrant` (+ `get-visible-modules.ts`) if gated; `components/admin/UserModuleEditor.tsx` (grant UI); launcher (`components/launcher/LauncherModules.tsx`); command palette gets it via modules config.

---

## 6. Core domain logic (`lib/`)

### Orders (`lib/orders`, `lib/shopify`, `lib/store2`, `lib/supabase/orders-cache.ts`)
- `fetchOrdersForStore(env, cacheTable, storeId, filter)` is the shared fetcher; `fetchOrders` = Store 1, `fetchStore2Orders` = Store 2. Strategy `prefer-cache` (default, 5-min freshness) | `live` | `cache-only`. Shopify REST `orders.json`, paginated by `since_id`, 250/page, API version default `2024-01`. Live results are upserted to cache in the background (+ `order_line_items`).
- Caches: `shopify_orders_cache` (S1) and **`shopify_orders_cache_s2`** (separate table to avoid ID collisions). Kept fresh by webhooks (§8).
- **COD detection** is client-side: `orderLooksLikeCod()` in `lib/shopify/fetch-cod-orders.ts` (gateway string heuristics; extend via `SHOPIFY_COD_MATCH_EXTRA`). Cached rows carry `is_cod`.
- **COD list always fetches live** (`cacheStrategy: "live"`) — deliberate, a stale cache silently dropped orders (`lib/store2/cod-list-data.ts`).
- Fulfillment: `lib/shopify/fulfill-order.ts` → `createFulfillmentForStore(fetchFn, env, storeId, input)`; Store 2 variant in `lib/store2/fulfill-order.ts`. Uses fulfillment_orders API, `notify_customer` from env. Wrapped by **idempotency** (`push_idempotency`, key = order+tracking+UTC day) and audited in `fulfillment_log`. HTTP entry: `lib/fulfillment/handle-fulfill-request.ts` shared by `/api/fulfill` and `/api/store2/fulfill`.
- Staff-created orders (`source_name === "shopify_draft_order"`) and cancelled orders are **excluded from sales reports**.

### Time windows (`lib/datetime`)
All business time is **Asia/Bahrain (UTC+3)**. COD **collection window** = previous day 14:00 → day 14:00 Bahrain, keyed by closing date (`YYYY-MM-DD`). Sales report uses full Bahrain calendar days. Use the helpers in `collection-window.ts` / `fulfillment-window.ts`; don't hand-roll offsets.

### Ubex (`lib/ubex`)
- `client.ts` `ubexFetch(path)` — adds `?token=` always + Bearer (unless `UBEX_BEARER=0`, retries without Bearer on 401/403), timeout (`UBEX_REQUEST_TIMEOUT_SECONDS`, 25s), retries w/ exponential backoff on 408/425/429/5xx (`UBEX_MAX_ATTEMPTS`, 3). Base `https://ubex-clients.apis.delivery`. Full API reference: `docs/ubex-api.txt`.
- **Matching Shopify orders → Ubex trackings** (`build-lookup.ts`, `lookup-helpers.ts`): Ubex has no direct Shopify id, so match by order reference (full normalized ref) or **last 4 digits** of the order number found in shipment `sender_barcode`/reference-like fields; last-4 collisions are tracked in `last4Conflicts` and dropped. Layers: in-process TTL cache (60s) → Supabase `ubex_cache` hydrate (once per boot) → Ubex list pages (default 3) → per-shipment detail fetches (cap 150, concurrency 12). `needed` set (Shopify last-4s) enables early exit. On Ubex failure, falls back to Supabase cache. Persisted matches live in `order_ubex_links` (per store).
- `resolveTrackingUrl()` — Ubex sometimes returns a bare base URL; falls back to `UBEX_TRACKING_URL_TEMPLATE` (default `https://ubex.co/tracking/{id}`).
- `fetch-awb.ts` — AWB PDF URL (expires ~24h, never persist). `lib/awb/lookup-order-tracking.ts` is the fast AWB resolver: `order_ubex_links` → `ubex_cache` unique last-4 → Ubex list pages 1–2 → persist.
- `inventory.ts` — paged inventory (page size 10!), `UBEX_INVENTORY_PAGE_DELAY_MS` (350) and `UBEX_INVENTORY_PAGE_PARALLEL` (1–3) throttle to avoid 429 "Too Many Attempts". Real sellable qty comes from **`available_qty`**, not `stock` (often 0). `fetchUbexStockByIds` refreshes stock.

### Stock (`lib/stock`, `lib/analysis`, `lib/shopify/inventory-*`)
- Join key is **barcode** (Ubex item ↔ Shopify variant at the store's default location; `SHOPIFY_LOCATION_ID` optional). `buildStockBalanceRows` statuses: `matched | unlinked | ambiguous (>1 variant) | skipped | store-b-not-listed`.
- **Shared-pool math** (`stock-balance-target.ts`): `sharedAvailable = ubex − A.committed − B.committed`; target `on_hand` for a store = `ubex − otherStoreCommitted` so that `available = on_hand − own_committed` equals the pool. A row is a "sellable mismatch" when a store's numbers disagree with that.
- `sync-shopify-from-ubex.ts` performs restock (GraphQL `inventory-write.ts`), with `stock_restock_idempotency` + `stock_restock_log` (store-scoped). Bulk restock API chunks to 20 items, `maxDuration = 300`.
- `load-stock-balance-preview.ts` → browse (paged/search) vs sweep ("Find all mismatches" → `stock_mismatch_snapshots` incl. commitment KPIs). `compute-stock-alerts.ts` → critical if stock 0 or ≤2 days runway, warning if <7 days; velocity from `order_line_items` over 14 days (`lib/analysis/sales-aggregates.ts`); snapshot in `stock_alert_snapshots`.
- Ubex inventory export SKU uses the **live Shopify SKU** (matched variant), not Ubex's stale `sku` (latest commits).

### Email (`lib/email`)
**Gmail SMTP via nodemailer** (`GMAIL_USER`, `GMAIL_APP_PASSWORD`) — *not* Resend, despite `.env.example`/PRD. Recipients are stored in `cod_settings` rows (`email_recipients` for COD, `sales_report_emails` for sales; COD falls back to `UBEX_EMAIL`). `cod_settings` is a generic key/value table — also holds `ubex_inventory_export_last_total`.

### FX (`lib/fx/getRates.ts`, `lib/currency.ts`)
GBP-based rates: Frankfurter → open.er-api → Supabase `fx_rate_snapshot` (today/most recent) → legacy `fx_rates_cache` → in-memory. COD list cross-converts to **AED base** (`toAedBasedRates`) because the GCC store's own currency is AED. `getCurrencyForCountry()` maps ISO country → currency; unknown → null (UI warns, no silent FX).

### Subscriptions (`lib/subscriptions`)
Public form (`/subscriptions/request`, honeypot field `website`, in-memory 5/hr/IP rate limit, kill-switch `SUBSCRIPTIONS_PUBLIC_ENABLED=0`) → row in `subscription_requests` + PDF generated with `pdf-lib` from `assets/subscriptions/template.pdf` → stored in Supabase Storage bucket `subscription-pdfs` → admins approve/reject (gated by `requireSubscriptionAccess`). Approver name is hardcoded (`SUBSCRIPTION_APPROVER_NAME`). Entities/currencies/payment methods are constant lists in `types.ts`.

### Zoho (`lib/zoho`)
OAuth refresh-token client; `fetchInvoiceForOrder(orderName)` finds invoice by `reference_number` (PO) with strict normalized equality, streams PDF via `/api/invoice`. Handles `MOVE-…`/`GCC-SS…` prefixed POs.

---

## 7. Database (Supabase / Postgres) — migrations 001–019

| Table | Purpose |
|---|---|
| `fulfillment_log` | Every Shopify fulfillment attempt (success/error, payloads, `created_by`, `store_id`) |
| `push_idempotency` | Dedup key per (order, tracking, day, store) |
| `shopify_orders_cache` / `_s2` | Webhook/live-fed order cache (`raw` JSON, `is_cod`, `last_synced_at`) |
| `order_line_items` | Normalized line items for sales/velocity analysis (store-scoped) |
| `order_ubex_links` | Resolved order→Ubex tracking, `ubex_status`, auto-fulfilled flag; partial index on pending. Drives cron |
| `ubex_cache` | Ubex shipment cache (`tracking`, `sender_barcode`, `tracking_url`, `last4`) |
| `cron_run_log` | One row per auto-fulfill run (running → success/error) |
| `cod_settings` | Generic key/value config (recipients, export estimate) |
| `cod_email_log` | COD emails sent |
| `cod_list_day_cache` | Per-close-day COD snapshot |
| `fx_rate_snapshot`, `fx_rates_cache` | FX persistence |
| `profiles` | Mirrors `auth.users` (trigger `handle_new_user`); `role`, `allowed_modules` |
| `portal_login_log` | Staff login audit |
| `stock_restock_log`, `stock_restock_idempotency` | Restock audit + dedup (store-scoped, 016) |
| `stock_mismatch_snapshots`, `stock_alert_snapshots` | Point-in-time dashboard KPIs |
| `subscription_requests` | Subscription workflow (+ `subscription_type` employee/business) |

Typed row shapes: `lib/supabase/types.ts`; per-table helpers live in `lib/supabase/*.ts`. Client is **untyped** (`createClient` without generics). New migration → next number, keep idempotent (`if not exists`), enable RLS, run `npm run db:push`.

---

## 8. API routes (`app/api`)

| Route | Auth | Notes |
|---|---|---|
| `auth/{login,logout,callback,login-event}` | public/session | login-event writes `portal_login_log` |
| `fulfill`, `store2/fulfill` | module `fulfillment` | via `handleFulfillRequest` |
| `sync/auto-fulfill` | `CRON_SECRET` bearer | **Cron**. Loops pending `order_ubex_links`; if Ubex status == `UBEX_FULFILLED_STATUS` (default "Order Fulfilled") → create Shopify fulfillment. `?dry_run=true` supported. Emails results/errors. Concurrency 5. |
| `store2/sync/auto-fulfill` | `CRON_SECRET` | Same for Store 2 |
| `sync/daily-sales-report` | `CRON_SECRET` | `?dry_run`, `?offset` (default −1 = yesterday) |
| `sync/trigger`, `sync/status` | session | UI manual trigger (defaults to dry run!) / last 10 cron runs |
| `webhooks/shopify/[topic]` | HMAC (`SHOPIFY_WEBHOOK_SECRET`) | orders-create/updated/cancelled, fulfillments-create/update → cache upserts. **Store 1 only** (uses Store 1 creds; no Store 2 webhook path) |
| `admin/register-webhooks`, `admin/users[/id]` | admin | webhook registration idempotent; user CRUD + modules |
| `cod-list/{download,email}`, `cod-settings`, `cod-email-log` | session/module | xlsx + email |
| `awb`, `invoice` | session | AWB URL / Zoho PDF |
| `stock-balance/{preview,restock,errors,history,mismatches}` | module `stock` | |
| `stock-analysis/product`, `stock-alerts/scan` | module grants | |
| `ubex-inventory/{search,download,download/progress}` | module `ubexInventory` | download `maxDuration=180` |
| `ubex/ping` | session | connectivity |
| `sales-report/{download,send}` | download **public**, send protected | |
| `subscriptions/*` | request = public (rate-limited); rest need subscriptions access | approve/reject/pdf |

**Cron schedule** (`vercel.json`, UTC): `0 14 * * *` auto-fulfill (S1 + S2) = **17:00 Bahrain**; `0 5 * * *` daily-sales-report = **08:00 Bahrain**. `lib/cron/auto-fulfill-schedule.ts` mirrors the 14:00 UTC hour for the UI countdown — update both together.

---

## 9. Frontend conventions

- **Server components load data; client components (`"use client"`) do interaction.** Slow data is streamed with `<Suspense>` + `TableSkeleton`. Pages that read live data set `export const dynamic = "force-dynamic"`.
- Shell: `app/(shell)/layout.tsx` does `requireSession` → visible modules → `Sidebar` / `Topbar` / `CommandPalette` (Cmd+K). Sidebar width via CSS var `--sb-w` (boot script reads `localStorage`). Mobile uses a bottom tab bar, content has `pb-28`.
- Design rules (`docs/design-plan.md`): launcher = glass/motion moment; module pages = **flat, opaque `bg-white`, dense** (no glass on tables). Font weights ≤ 500. Numbers/IDs/timestamps in the mono font. Motion presets come from `lib/motion.ts` — don't inline bespoke transitions. Use `lucide-react` icons only. Card radius token `rounded-card`; borders `border-line`; `shadow-soft`.
- Tailwind tokens: `canvas #FAFAF9`, `ink #1A1A1A`, `muted`, `line`, domain colours `cod/stock/subscriptions/gold`. (`design-plan.md` still lists fulfillment as rust; code made it share COD teal.)
- Bulk-push UX: `hooks/useRowPushQueue.ts` (row state machine pending/matched/fulfilled/error). Restock queue: `RestockQueueProvider` + `SyncProgressTray`. URL-synced view state: `hooks/useUrlViewState.ts`.
- Brand: the Seissense brand skill/palette (Sand, Granite, Willow…) is for customer-facing material; the portal uses its own internal design tokens above.

---

## 10. Environment variables

Authoritative = what code reads (`grep process.env`). Groups:

- **Shopify S1**: `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ADMIN_ACCESS_TOKEN`, `SHOPIFY_API_VERSION`, `SHOPIFY_TRACKING_COMPANY`, `SHOPIFY_NOTIFY_CUSTOMER`, `SHOPIFY_WEBHOOK_SECRET`, `SHOPIFY_LOCATION_ID`, `SHOPIFY_COD_MATCH_EXTRA`, `PORTAL_PUBLIC_URL`
- **Shopify S2**: `SHOPIFY_STORE2_{DOMAIN,ACCESS_TOKEN,API_VERSION,TRACKING_COMPANY,NOTIFY_CUSTOMER}`, `FULFILLMENT_STORE2_WINDOW_DAYS`; shared `FULFILLMENT_WINDOW_DAYS`
- **Ubex**: `UBEX_API_TOKEN`, `UBEX_API_BASE_URL`, `UBEX_BEARER`, `UBEX_EMAIL` (fallback COD recipient), `UBEX_TRACKING_URL_TEMPLATE`, `UBEX_FULFILLED_STATUS`, `UBEX_MAX_LIST_PAGES`, `UBEX_MAX_DETAIL_FETCHES`, `UBEX_DETAIL_CONCURRENCY`, `UBEX_LOOKUP_TTL_SECONDS`, `UBEX_REQUEST_TIMEOUT_SECONDS`, `UBEX_MAX_ATTEMPTS`, `UBEX_INVENTORY_PAGE_DELAY_MS`, `UBEX_INVENTORY_PAGE_PARALLEL`, `STOCK_BALANCE_MAX_ITEMS`
- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` (scripts only)
- **Auth**: `AUTH_PROVIDER`, `PORTAL_PASSWORD`, `SESSION_SECRET` (legacy shared mode)
- **Cron**: `CRON_SECRET`
- **Email**: `GMAIL_USER`, `GMAIL_APP_PASSWORD`
- **Zoho**: `ZOHO_CLIENT_ID/SECRET/REFRESH_TOKEN/ORG_ID`, optional `ZOHO_BASE_URL`, `ZOHO_ACCOUNTS_URL`, `ZOHO_REQUEST_TIMEOUT_SECONDS`
- **Misc**: `SUBSCRIPTIONS_PUBLIC_ENABLED`

**Drift:** `.env.example` documents `RESEND_API_KEY` / `RESEND_FROM_EMAIL` (unused in code) and omits `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `SUBSCRIPTIONS_PUBLIC_ENABLED`. Never print or commit real `.env` values.

---

## 11. Gotchas & things to verify

1. **Cron method mismatch (verify!)** — Vercel Cron issues **GET** requests, but `sync/auto-fulfill` (and `store2/...`, `daily-sales-report`) only do real work on **POST**; their GET handlers return a status JSON. Check `cron_run_log` / Vercel cron logs to confirm the scheduled runs actually execute. If not, make GET delegate to the POST logic (keeping the `CRON_SECRET` check).
2. `/api/sync/trigger` defaults to **dry run** unless `?dry_run=false`.
3. Shopify webhooks only populate **Store 1** caches; Store 2 relies on live fetch / `prefer-cache` TTL.
4. `needsExplicitGrant` logic is duplicated (`can-access-module.ts`, `get-visible-modules.ts`) — change both.
5. Ubex `stock` field is unreliable; use `available_qty`. Ubex inventory pages are 10 items and rate-limited — keep delays.
6. Ubex↔Shopify order matching is **last-4 digits** heuristic; collisions are intentionally dropped, so some orders legitimately have no `ubexId`.
7. Supabase-dependent helpers silently no-op when the service client is null (misconfig looks like "no data"). `/admin/health` surfaces config checks.
8. In-memory state (Ubex lookup cache, subscription rate limiter, `hydratedFromSupabase`) is per serverless instance — not shared.
9. `docs/prd.md` and parts of `docs/design-plan.md` are historical; `ModuleAccent` and `tailwind.config.ts` are current for colours.
10. `.claude/` and `.cursor/` are gitignored; this file is the shared context.

---

## 12. Recent history (git, newest first)

Ubex inventory export (SKU from live Shopify, per-store committed, progress/ETA) → Stock Alerts → daily Sales Report module (email + xlsx + public link, excludes staff draft orders) → Stock Balance redesign around daily mismatch review → COD list made GCC-only / AED fix → Cmd+K palette & launcher stats → login redesign → Stock Analysis + Ubex Inventory modules → Zoho invoice/AWB.
