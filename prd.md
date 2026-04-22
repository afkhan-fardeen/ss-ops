# Seissense Ops Portal — Product Requirements Document

**Version:** 1.0  
**Date:** 22 April 2026  
**Status:** Draft  

---

## 1. Overview

The Seissense Ops Portal is an internal web application for the Seissense team to manage day-to-day e-commerce operations. The first release ships a single feature: the **COD List Generator**. The portal is designed to grow — future modules (Fulfillment, Reports, etc.) will be added over time within the same shell.

---

## 2. Problem Statement

Every day before 2pm, a team member manually:

1. Filters Shopify orders by Cash on Delivery payment method
2. Copies order details into an Excel spreadsheet
3. Manually calculates the local currency amount (SAR, AED, etc.) from GBP using a rough or outdated rate
4. Sends the file to Ubex/Logistechs for COD collection

This process is error-prone, time-consuming, and relies on manual currency conversion. The portal eliminates all of this.

---

## 3. Goals

- Replace the manual COD Excel process with a one-click, auto-generated list
- Use live FX rates for accurate GBP → local currency conversion
- Match the exact Excel column format Ubex expects
- Allow the list to be downloaded as `.xlsx` or emailed directly to Ubex
- Lay the foundation for a multi-feature internal ops portal

---

## 4. Non-Goals (v1)

- No authentication system beyond a simple shared password (team is small)
- No automatic Shopify fulfillment updates (separate feature, later)
- No Ubex API integration for UBEX ID auto-fill (manual for now)
- No multi-user roles or permissions

---

## 5. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Server Actions, RSC, fast DX |
| Hosting | Vercel | Zero-config deploys, cron support |
| Database | Supabase (if needed) | Auth, logs, future feature state |
| Shopify | Shopify Admin REST API | Order fetching |
| FX Rates | Open Exchange Rates or Frankfurter API | Live GBP → GCC rates |
| Excel Export | `exceljs` | Matches existing format exactly |
| Email | Resend | Simple transactional email with attachment |
| Styling | Tailwind CSS | Utility-first, fast to build, consistent |
| Fonts | DM Serif Display + DM Mono + Instrument Sans | Distinctive, editorial feel |
| State | React `useState` / Server Actions | No need for heavy state management in v1 |

---

## 6. Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Vercel Edge                      │
│                                                      │
│  ┌──────────────┐     ┌──────────────────────────┐  │
│  │  Next.js App │────▶│  Server Actions           │  │
│  │  (App Router)│     │  - fetchCODOrders()       │  │
│  └──────────────┘     │  - fetchLiveRates()       │  │
│                       │  - generateExcel()        │  │
│                       │  - sendEmail()            │  │
│                       └──────┬───────────────┬───┘  │
│                               │               │      │
└───────────────────────────────┼───────────────┼──────┘
                                │               │
                    ┌───────────▼──┐   ┌────────▼──────┐
                    │ Shopify Admin│   │  FX Rates API  │
                    │ REST API     │   │  (Frankfurter) │
                    └─────────────┘   └───────────────┘
```

**Data flow:**
1. User opens `/cod-list` page
2. Server Action fires on page load — fetches COD orders from Shopify (yesterday 14:00 → today 14:00) + live GBP rates simultaneously
3. Data returned to client, rendered in table
4. User clicks Download → `exceljs` generates `.xlsx` on the server, streamed to browser
5. User clicks Send → Resend API sends email with `.xlsx` attachment to configured Ubex email

---

## 7. Feature Spec — COD List (v1)

### 7.1 Collection Window

- Window is always: **yesterday 14:00 → today 14:00** (local Bahrain time, GMT+3)
- Displayed clearly at the top of the page
- No manual date picker in v1 (add later if needed)

### 7.2 Order Fetching

Fetch from Shopify Admin API:

```
GET /admin/api/2024-01/orders.json
  ?financial_status=pending
  &gateway=cash_on_delivery
  &created_at_min={yesterday_14:00_ISO}
  &created_at_max={today_14:00_ISO}
  &status=any
  &fields=name,customer,shipping_address,total_price,currency,financial_status
  &limit=250
```

- Filter client-side for `payment_gateway === "cash_on_delivery"` if Shopify returns mixed results
- Handle pagination if orders > 250

### 7.3 Currency Conversion

- Fetch live rates from **Frankfurter API** (free, no key required):
  ```
  GET https://api.frankfurter.app/latest?from=GBP&to=SAR,AED,KWD,BHD,QAR,OMR
  ```
- Map shipping country to currency:

| Country Code | Currency |
|---|---|
| SA / KSA | SAR |
| AE | AED |
| KW | KWD |
| BH | BHD |
| QA | QAR |
| OM | OMR |

- Round converted amount to nearest whole number (matching current Excel convention)
- Cache rates for the session — no need to re-fetch on every render

### 7.4 Table Columns

Match the existing Excel format exactly:

| Column | Source |
|---|---|
| Order Name | `order.name` (e.g. `#MOVE-252417`) |
| UBEX ID | Blank — filled manually |
| Payment Method | Always `"Cash on Delivery (COD)"` |
| Outstanding Balance | `order.total_price` formatted as `£XXX.XX` |
| To Collect | GBP amount × live rate, rounded, with currency code |
| Customer Name | `order.customer.first_name + last_name` |
| Shipping Address | Full formatted address |
| Shipping Country | Country code from shipping address |

### 7.5 Excel Export

- Uses `exceljs` to generate the `.xlsx` on the server
- One sheet named for today's date (e.g. `22nd April`)
- Matches column order, header row styling (light blue fill, Arial font, bold) from existing file
- Filename: `COD_Seissense_22-Apr-2026.xlsx`
- Triggered via Server Action, file streamed to browser as download

### 7.6 Email Send

- Single configured recipient: Ubex email address (stored in `.env`)
- Subject: `COD List — Seissense — 22 Apr 2026`
- Body: short plain text with order count + total GBP
- Attachment: the generated `.xlsx` file
- Sent via **Resend** API
- Success/error toast shown in UI after send

### 7.7 Live Rates Display

- Shown as pills at the top of the page
- All 6 GCC currencies displayed
- Pulsing green dot to indicate live data
- Shows time last fetched

---

## 8. Portal Shell

The portal shell wraps all current and future features.

### 8.1 Sidebar Navigation

```
SEISSENSE
Operations Portal
─────────────────
TOOLS
  ● COD List          ← active
  ○ Fulfillment       [Soon]
  ○ Reports           [Soon]

SETTINGS
  ○ Account
─────────────────
[FK]  Fardeen   [🌙]
```

- Fixed left sidebar on desktop (220px wide)
- Collapses to hamburger menu on mobile
- Active state with left accent bar
- Dark/light theme toggle persists via `localStorage`

### 8.2 Topbar

- Shows current page title + today's date
- Hamburger icon on mobile to open sidebar
- Clean, minimal — no unnecessary elements

---

## 9. Design Principles

### 9.1 Aesthetic Direction
**Editorial-minimal with operational clarity.** Inspired by luxury fashion ops tools — not generic SaaS. Everything has a reason to exist on screen.

### 9.2 Typography
- **Display:** `DM Serif Display` — page titles, large numerals
- **Mono:** `DM Mono` — order IDs, amounts, codes, labels, badges
- **Body:** `Instrument Sans` — navigation, table content, buttons

### 9.3 Colour System

```css
/* Dark theme */
--bg:        #0a0a0a   /* page background */
--bg2:       #111111   /* cards, sidebar */
--bg3:       #1a1a1a   /* hover states, table header */
--border:    #2a2a2a
--text:      #f0ede8
--text2:     #888880   /* secondary labels */
--text3:     #555550   /* muted, mono labels */
--accent:    #c8b89a   /* warm sand — brand-aligned */
--green:     #4a9e6e   /* live dot, success states */

/* Light theme — warm parchment base */
--bg:        #f5f2ed
--bg2:       #ffffff
--bg3:       #ede9e2
--accent:    #8b6f4e
```

### 9.4 Spacing & Layout
- Base unit: `4px`
- Cards use `16px` padding minimum, `32px` on desktop
- Consistent `10px` border radius on all cards and buttons
- Generous whitespace — never cramped

### 9.5 Motion
- Page load: staggered `fadeUp` animation on each card section
- Table rows: sequential `animation-delay` for cascade effect
- Button hover: subtle `translateY(-1px)` + shadow on primary CTA
- Theme switch: `0.3s` transition on background and color
- Live rate dot: slow `pulse` animation

### 9.6 Responsiveness

| Breakpoint | Behaviour |
|---|---|
| Desktop (>768px) | Fixed sidebar, full table with all columns |
| Tablet (768px) | Sidebar collapses, GBP column hidden |
| Mobile (<480px) | Hamburger nav, stacked footer actions, condensed table |

---

## 10. Environment Variables

```env
SHOPIFY_STORE_DOMAIN=seissense.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxxxxxxxxx
UBEX_EMAIL=ops@logistechs.co
RESEND_API_KEY=re_xxxxxxxxxxxx
PORTAL_PASSWORD=xxxxxxxxxx
```

---

## 11. File Structure

```
seissense-portal/
├── app/
│   ├── layout.tsx              # Root layout with sidebar shell
│   ├── page.tsx                # Redirect to /cod-list
│   ├── cod-list/
│   │   └── page.tsx            # COD List page (RSC)
│   └── api/
│       └── download-excel/
│           └── route.ts        # Excel file generation + stream
├── actions/
│   ├── fetchCODOrders.ts       # Shopify API call
│   ├── fetchLiveRates.ts       # Frankfurter API call
│   └── sendCODEmail.ts         # Resend email with attachment
├── components/
│   ├── Sidebar.tsx
│   ├── Topbar.tsx
│   ├── RatesStrip.tsx
│   ├── CODTable.tsx
│   ├── FooterBar.tsx
│   └── ThemeToggle.tsx
├── lib/
│   ├── shopify.ts              # Shopify client
│   ├── excel.ts                # exceljs builder
│   ├── currency.ts             # Country → currency map + conversion
│   └── utils.ts
├── .env.local
└── next.config.ts
```

---

## 12. Phases & Milestones

### Phase 1 — Portal Shell + COD List (v1)
- [ ] Next.js project setup, Vercel deploy
- [ ] Sidebar + topbar layout, dark/light theme
- [ ] Shopify order fetch (Server Action)
- [ ] Live FX rates fetch (Frankfurter)
- [ ] COD table render with correct columns
- [ ] Excel export (matching existing format)
- [ ] Email send via Resend

### Phase 2 — COD Automation
- [ ] Vercel cron job at 14:00 daily (GMT+3)
- [ ] Auto-send email without opening portal
- [ ] Log of sent COD lists (Supabase)

### Phase 3 — Fulfillment Module
- [ ] Poll Ubex API for new tracking numbers
- [ ] Auto-fulfil matched Shopify orders
- [ ] Attach tracking link

### Phase 4 — Reports Module
- [ ] Sales by country
- [ ] COD vs prepaid split
- [ ] Daily order volume

---

## 13. Open Questions

| # | Question | Owner |
|---|---|---|
| 1 | What is the exact Ubex recipient email for COD list? | Fardeen |
| 2 | Should UBEX ID column stay blank in v1 or attempt API match? | Fardeen |
| 3 | Is a password gate enough for v1 auth, or do we need proper login? | Fardeen |
| 4 | Confirm Shopify payment gateway name — is it exactly `cash_on_delivery`? | Fardeen |