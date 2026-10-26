# SS-OPS Code Audit

Date: 2026-10-26 · Scope: whole repo @ `b20b2d1`.

**Status after follow-up work (uncommitted):** DONE — P0-1 (fail-closed + timing-safe cron guard), P0-2 (moot: cron on hold, `crons` removed), P0-3 (open redirect), P0-5 (cancelled orders), P1-1 (admin/module checks on webhooks, trigger, recipients, AWB, invoice), P1-7 (security headers, no CSP yet), dead COD code/tables-in-code removed. NOT done — P0-4 dependency upgrades, P1-2 signed sales-report links, P1-3 Shopify timeout/retry, P1-4 webhook ordering, P1-5/6 error leakage, P3 duplicate consolidation (Shopify client, mail transporter, clientIp).
Method: `tsc --noEmit` (clean), `next lint` (clean), `npm audit`, auth matrix of all 38 API routes, grep-based dead-code/duplication scan, manual read of auth, orders, fulfillment, cron, webhook, stock, email, subscriptions code, git-history secret scan.
Every fix below is a standard, documented practice (OWASP, Next.js docs, Shopify/Vercel docs) — nothing bespoke.

Severity: **P0** fix now · **P1** fix soon · **P2** hardening · **P3** cleanup.

---

## What is already good (keep)
- Webhook HMAC check uses `timingSafeEqual` on the raw body. Shared-password compare is timing-safe; session cookie is HttpOnly + SameSite=Lax + Secure in prod and signed with HMAC.
- Fulfillment push has real idempotency (unique key + DB log + release on failure) and also relies on Shopify's open-fulfillment-order check.
- Ubex client has timeout + bounded retries with exponential backoff; Ubex failures degrade to Supabase cache.
- Service-role key is server-only; RLS enabled on all tables; no secrets in git history (only `shpat_xxx` placeholders); `.env` ignored.
- Migrations idempotent; `tsc` and ESLint are clean.

---

## P0 — Fix now

### P0-1. Cron endpoints fail **open** when `CRON_SECRET` is unset, and compare with `!==`
`app/api/sync/auto-fulfill/route.ts:39`, `app/api/store2/sync/auto-fulfill/route.ts:39`, `app/api/sync/daily-sales-report/route.ts:21` all do `if (cronSecret) { check }`. `/api/sync/*` is a **public prefix in `middleware.ts`**, so if the env var is ever missing/misspelled in a deployment, anyone on the internet can trigger live Shopify fulfillments (with customer-notification emails) or spam the sales-report email list.
**Fix (Vercel's documented pattern):** fail closed — `if (!secret) return 500`; compare with `timingSafeEqual`; put the check in one shared helper (`lib/auth/verify-cron.ts`) used by all three routes.

### P0-2. Vercel Cron sends **GET**; the real work is only on **POST** (verify)
`vercel.json` crons hit the path with GET. The GET handlers of auto-fulfill / store2 auto-fulfill / daily-sales-report only return a status JSON. Unless something else calls POST, **scheduled fulfillment and the daily report never run**. Check `cron_run_log` and Vercel cron logs.
**Fix:** export the same handler for GET and POST (guarded by the P0-1 check). Keep `dry_run` as a query param.

### P0-3. Open redirect via `?next=/\evil.com`
`lib/auth/safe-next-path.ts` rejects `//` but not a backslash. `new URL("/\\evil.com/x", base)` resolves to `https://evil.com/x` (verified in Node), and `/api/auth/callback` redirects with exactly that. Classic phishing vector after login (OWASP "Unvalidated Redirects").
**Fix:** reject any `\`, control chars, and anything where `new URL(next, "http://x").origin !== "http://x"`; return the normalized `pathname+search`, not the raw string.

### P0-4. Framework dependencies with known critical/high CVEs
`npm audit --omit=dev`: **next 14.2.35** — 24 advisories incl. 3 critical (RCE in Image Optimizer w/ AVIF/SVG, RCE on Windows hosts), plus DoS in Server Components/Server Actions, SSRF, middleware/cache issues; **nodemailer 8.0.11** — high (raw-option file read/SSRF, address-parser DoS) and recipient-domain bypass; transitive `postcss`, `source-map-js`, `brace-expansion`.
Exposure here is partly reduced (no `next/image` use, hosted on Linux/Vercel), but Server Components DoS and middleware advisories apply. **Fix:** upgrade Next to the latest patched **15.5.x** line (smallest jump that clears everything except the 16-only items; follow Next's upgrade guide, run `tsc`+build), upgrade nodemailer to the patched major, `npm audit fix` for the non-breaking transitive ones. Do this on a branch; there are no automated tests, so smoke-test COD, Fulfillment, Stock, login manually.

### P0-5. Cancelled orders are not filtered from COD list / Fulfillment queue
`cancelled_at` is fetched but only the sales report filters it. `lib/store2/cod-list-data.ts` and `app/(shell)/fulfillment/page.tsx` never do. A cancelled COD order is therefore listed as cash **to collect** and emailed to Ubex; cancelled orders show up in the fulfillment queue and the cron will keep erroring on them (closed fulfillment orders → error emails).
Also the cancel webhook writes `fulfillment_status = "cancelled"` into the cache (a value Shopify never uses) and `readOrdersFromCache` treats anything `!= fulfilled` as unfulfilled.
**Fix:** exclude `cancelled_at != null` in one place (`fetchOrdersForStore`, both live and cache paths, with an option to include them), store `cancelled_at` as a column, stop overloading `fulfillment_status`. Business owner should confirm cancelled COD orders must never be collected.

---

## P1 — Fix soon

### P1-1. Authorization gaps: "logged in" ≠ "allowed" (broken access control, OWASP A01)
Routes that check only `requireSession()` and let **any** signed-in user (incl. a restricted member or a legacy shared-password session) act:
| Route | Impact |
|---|---|
| `POST /api/cod-settings` | change recipients of COD email, **sales report** and cron notification emails → exfiltrate sales data to an outside address |
| `POST /api/admin/register-webhooks` (+GET) | comment says "Admin-only", code isn't; re-points Shopify webhooks |
| `POST /api/sync/trigger?dry_run=false` | any user can run the live auto-fulfill |
| `POST /api/cod-list/email`, `GET /api/cod-list/download`, `/api/cod-email-log`, `/api/awb`, `/api/invoice` | not tied to the `cod` / `awb` module grants, so `allowed_modules` is only enforced by the UI |
**Fix:** one `requireModuleAccess("cod"|"awb"|…)` / `requirePortalAdmin()` per route (helpers already exist). Make this a lint-by-convention: every route handler starts with an auth helper. Also dedupe `needsExplicitGrant` which exists in two files (`can-access-module.ts`, `get-visible-modules.ts`) — derive visibility from `canAccessModule` rules in one place.

### P1-2. Public sales-report link has no secret
`/sales-report` and `/api/sales-report/download?day=` are public by design, but the URL is guessable (`?day=YYYY-MM-DD`), so anyone can read any day's revenue for both stores, and each hit triggers live Shopify fetches (cost/DoS amplification; no rate limit).
**Fix (standard signed URL):** include `exp` + HMAC(`day|exp`, secret) in the emailed link and verify it server-side; cache the computed report per day (`Cache-Control`/DB row). If the owner truly wants "anyone with the link", at least add rate limiting.

### P1-3. Shopify REST calls have no timeout, no 429/5xx retry, no pagination guard
`fetchFromShopify`, `shopifyFetch` (×4 copies), webhook refetch: none use `AbortSignal.timeout` or honour `Retry-After` / `X-Shopify-Shop-Api-Call-Limit`. One slow Shopify response hangs a serverless function until Vercel kills it; bursts throw away the whole page. Also pagination uses `since_id` with a client-side `Math.max` and no max-page cap.
**Fix:** one shared `shopifyRest(store, path, init)` client: `AbortSignal.timeout(15s)`, retry 429/5xx with backoff honouring `Retry-After` (Shopify's documented rate-limit guidance), and a hard page cap. Migrating off REST pagination to cursor-based GraphQL/`Link` header is Shopify's recommended direction (REST Admin is legacy).

### P1-4. Webhook handling: ordering, replays, Store 2, errors
- No `X-Shopify-Webhook-Id` de-dup and no `updated_at` comparison: out-of-order `orders/updated` deliveries can overwrite newer cache rows with older data (Shopify documents that ordering is not guaranteed). **Fix:** upsert only if incoming `updated_at` ≥ stored.
- Dead branch in `handleOrdersCancelled` (`else if (typeof id === "number")` unreachable).
- Store 2 has no webhook route/secret → its cache is only TTL-based. Either register + verify per store, or document "Store 2 is always live".
- Returns 500 on any failure → Shopify retries 19× then removes the subscription; return 200 for permanent/invalid payloads, 5xx only for transient errors.

### P1-5. Public subscription form: orphaned files + error leakage
`/api/subscriptions/request` uploads the PDF **before** inserting the DB row; an insert failure leaves orphaned PDFs in Storage, and it echoes `e.message` (internal errors) to the anonymous caller. Rate limit is an in-memory `Map` — per serverless instance, so effectively not enforced under load (same for `/api/auth/login`).
**Fix:** insert row first (or compensate by deleting the file), return a generic message + log server-side, use a shared store for rate limiting (Upstash/Vercel KV or a Postgres counter) or Vercel Firewall rate-limit rules. Add max lengths to every free-text field in `validate.ts` and a request-body size cap.

### P1-6. Internal error details returned to clients everywhere
19 handlers return `e instanceof Error ? e.message : …` to the browser (Supabase/Shopify/Ubex messages, URLs, table names). OWASP "Improper error handling". **Fix:** `apiError(e, publicMessage)` helper: log full error server-side with a request id, return a stable code/message.

### P1-7. No security headers / CSP
`next.config.mjs` is empty. **Fix (Next.js docs, `headers()`):** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (or `frame-ancestors 'none'`), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, HSTS, and a CSP (nonce-based per Next's CSP guide; the inline boot script in `app/(shell)/layout.tsx` needs the nonce). The AWB/Invoice iframes will need an explicit `frame-src`/`frame-ancestors` review.

### P1-8. Reliability of the cron job
- Runs sequentially in one function; no `maxDuration`, so a large backlog can be killed mid-run leaving `cron_run_log` stuck at `running`. **Fix:** export `maxDuration`, add a time budget (stop and resume next run), mark stale `running` rows as `timeout`.
- Idempotency key includes the UTC date, so a retry across 00:00 UTC gets a fresh key (the Shopify open-fulfillment-order check still protects, but the key should not be time-based; use order+tracking only and clear on error).
- `claimIdempotency` fails **open** on non-conflict DB errors (documented choice); acceptable, but then rely on the Shopify check and log it loudly.

---

## P2 — Hardening

- **HTML email injection:** emails are built with template strings and no escaping (`send-fulfillment-notification.ts:114`, `send-daily-sales-email.ts`, `send-cod-email.ts`). Values (order/product names, error text, tracking URL in `href`) come from external systems. Add one `escapeHtml()` and validate URLs are `https:`.
- **`select("*")`** in 16 places incl. `fulfillment_log` (stores full request/response payloads) and `subscription_requests` (PII). Select needed columns only.
- **Unbounded reads:** `readOrdersFromCache` caps at 10k, `load-stock-restock-activity` 1000, others none; add pagination/limits to dashboards and history endpoints.
- **Input validation:** request bodies are cast (`as FulfillBody`, `as {recipients}`) rather than validated; `cod-settings` accepts anything containing `@` as an email. Use a schema validator (Zod is the de-facto standard) at every route boundary; validate `trackingUrl` scheme.
- **`/api/sync/trigger`** proxies to itself over HTTP with the cron secret; call the shared function directly instead (also avoids exposing the secret path and an extra cold start).
- **Logins:** legacy shared-password mode is a single password for everyone, no per-user audit; it is on by default whenever Supabase env is absent. Disable in production (`AUTH_PROVIDER=supabase`) and consider deleting the code path.
- **IP for rate limiting/audit** trusts the first `x-forwarded-for` value in 4 copies; on Vercel use the platform-provided value consistently from one helper.
- **Webhook & cron routes** should set `export const dynamic = "force-dynamic"` / `runtime = "nodejs"` explicitly (webhook does; crons don't).
- **Session cookie lifetime** 7 days fixed, no rotation/revocation in shared mode.
- **Dependency hygiene:** add Dependabot/Renovate + `npm audit` in CI; there is **no CI and no tests**. Minimum viable: unit tests for pure logic (`collection-window`, `build-lookup` matching, `stock-balance-target`, `safe-next-path`, `commitment`, idempotency key) and a CI job running `tsc`, `lint`, `build`.

---

## P3 — Redundancy & dead code

**Duplicate implementations (consolidate):**
| Thing | Copies |
|---|---|
| Shopify REST fetch wrapper | `lib/shopify/fulfill-order.ts`, `lib/store2/client.ts`, `lib/shopify/fetch-single-order.ts`, `app/api/admin/register-webhooks/route.ts`, inline in webhook route, `orders/fetch-orders.ts` (+ GraphQL variants in `inventory-read/write`) → one `lib/shopify/client.ts` taking `storeId` |
| Shopify env reading (`getEnv`) | 4 files (`fulfill-order`, `fetch-orders`, `inventory-read`, `inventory-write`) + `store2/client` → one `getStoreEnv(storeId)` |
| Auto-fulfill cron | `sync/auto-fulfill` and `store2/sync/auto-fulfill` are ~90% identical (diff is ~60 lines of naming) → one `runAutoFulfill(storeId)` |
| Cron auth check | 3 copies |
| `getTransporter()` nodemailer | 3 copies (`send-cod-email`, `send-daily-sales-email`, `send-fulfillment-notification`) → `lib/email/transport.ts` (+ recipients getter) |
| `clientIp()` | 3 route copies + inline in callback |
| `formatMoney` | `lib/utils.ts`, `lib/subscriptions/constants.ts`, `send-daily-sales-email.ts`, `OrdersProductsPanel.tsx` + local variants in sales report page |
| `DATE_KEY_RE`, `sleep`, `normalizeBarcode` (×3), `parseList` | copy-pasted across files |
| Store 1 vs Store 2 variants of fulfill, orders fetch, COD loader | thin wrappers are fine; the duplicated bodies are not |
| `fulfillment/list`, `cod/list`, `stock-balance/balance` re-export pages + `aliases` | keep only while legacy URLs are needed; redirect legacy paths in `next.config` (`redirects()`) and delete the aliases/duplicate `MODULE_ROUTE_ENTRIES` rows (`/cod/history` is listed twice in `config/modules.ts`) |

**Dead / unused:**
- `lib/shopify/fetch-cod-orders.ts::fetchCodOrders` — no callers ("back-compat" wrapper). Remove.
- `lib/cod/cod-list-params.ts::normalizeCodListSearchParams`, `lib/email/send-daily-sales-email.ts::getSalesReportRecipients` — exported, never imported.
- DB table **`cod_list_day_cache`** (migration 008) — no code reads/writes it.
- **`fx_rates_cache`** + `lib/supabase/fx-cache.ts` — legacy, kept "for back-compat"; `fx_rate_snapshot` supersedes it.
- `@deprecated` fields in `StockBalanceRow` (`shopifyOnHand`, `shopifyAvailable`, `shopifyCommitted`, `delta`, `shopifyVariantLabel/Id/InventoryItemId`) — still referenced in 10 places; migrate callers to `storeA` then delete. `config/navigation.ts` `NavItem` is marked deprecated but still used by Sidebar/CommandPalette.
- `"cancelled"` string used as a fake fulfillment status (see P0-5); `ShopifyOrder.gateway` / `payment_gateway_names` dual logic could use one normalized field.
- `docs/prd.md` states Resend/no-auth/Store 1 COD — outdated; `.env.example` lists unused `RESEND_*` and omits `GMAIL_*`, `SUBSCRIPTIONS_PUBLIC_ENABLED`.
- `scripts/` one-offs (`purge-bad-tracking-urls`, `clear-stuck-idempotency`) — keep only if still needed; they are referenced by `npm run` aliases.
- Only 2 `console.log`, no TODOs — clean in that respect. No unimported component/lib files were found.

**Maintainability notes (no action required now):** several components >300 lines (`SubscriptionDetailView` 758, `StockBalanceView` 485, `config/modules.ts` 551 with large repetitive route table → derive `MODULE_ROUTE_ENTRIES` from `getPortalModules()`); in-memory caches (`CACHE`, `hydratedFromSupabase`) are per instance and non-obvious on serverless; Supabase client is untyped (generate types with `supabase gen types` for compile-time safety on queries).

---

## Suggested order of work
1. **Day 1 (small, high value):** P0-1, P0-2, P0-3, P1-1 (auth checks), P0-5 (cancelled filter) — each is a few lines.
2. **Day 2:** P0-4 dependency upgrades on a branch + manual smoke test; add `npm audit`/Dependabot.
3. **Week 1:** shared Shopify client with timeout/retry (P1-3) → collapse duplicates (P3) in the same pass; webhook ordering (P1-4); security headers (P1-7); sales-report signed links (P1-2).
4. **Then:** error-handling helper + Zod validation at route boundaries, escape email HTML, cron time budget, add a minimal test + CI baseline, remove dead code/tables.

I can implement any batch — say which (suggested: Day 1 as one commit, P0-4 as a separate branch).
