# Seissense Ops — design system

Principles (modelled on Shopify Polaris, Material 3 and Dropbox's approach): **few rules, applied everywhere, checked automatically.**
Polish comes from consistency, not decoration — if a size, colour or radius is not in this file, don't use it.

## 1. Grid and spacing
- 4px base. Use Tailwind spacing steps `1 2 3 4 5 6 8 10 12 16` (= 4…64px). **No half steps** (`2.5`, `3.5`…); `0.5` (2px) only for hairline nudges.
- Phone page margin 16px (`px-4`), desktop gutter 24–32px. Gap between cards: 12px phone / 16px desktop.
- Touch targets ≥ 44×44px on phones (a global `@media (pointer: coarse)` rule expands small buttons' hit area); ≥ 24px everywhere (WCAG 2.2 AA).

## 2. Type roles (Inter; `font-mono` only for identifiers)
Use the role classes — never `text-[13px]`, `text-sm`, etc. Weight is explicit: **400 body · 500 labels/buttons/nav · 600 headings/numbers**.

| Role | Phone | Desktop | Use |
|---|---|---|---|
| `text-display` | 24/32 | 28/36 | Overview greeting only |
| `text-title` | 18/24 | 20/28 | Top-bar title, stat numbers, big empty states |
| `text-heading` | 16/24 | 14/20 | Card / section titles (600) |
| `text-body-lg` | 16/24 | 14/20 | Form fields, primary list text, buttons |
| `text-body` | 14/20 | 14/20 | Default text, descriptions |
| `text-body-sm` | 13/20 | 13/20 | Secondary text, table cells |
| `text-caption` | 12/16 | 12/16 | Meta, helper text, chips, nav labels (floor: nothing smaller) |
| `text-code` | 13/20 | 13/20 | Mono: order numbers, tracking/Ubex IDs, barcodes, SKUs, env names |

Numbers, amounts, dates: Inter with `tabular-nums` (not monospace). Eyebrow labels are uppercase on desktop only (`uppercase … max-md:normal-case`).

## 3. Shape and depth
- Radii: `rounded-control` 8px (buttons, inputs, chips-as-rects) · `rounded-card` 12px (cards, lists, tables) · `rounded-sheet` 16px (sheet tops, dialogs, auth card) · `rounded-full` (pills, avatars).
- Depth: flat + 1px `border-line`. `shadow-soft` on cards; `shadow-pop` only on floating UI (sheets, menus, FAB).

## 4. Colour (all text pairs ≥ 4.5:1, verified)
- Neutrals: `canvas` page · `ink` text · `muted` secondary text · `line` borders · white surfaces.
- Primary (actions, links, focus): blue — `primary` (#2563EB), `primary-strong` (pressed / text on tint), `primary-soft` (tint).
- **One accent per area** (icons, active nav, dots, KPI borders, charts): `orders` blue · `inventory` teal · `finance` orange · `system` cyan (Account/Admin). Each has `DEFAULT` (text/icon), `solid` (bars/fills), `soft` (tint), `line` (border). Module accents live in `config/modules.ts` (`accentForDomain`).
- Semantic (`DEFAULT` = text/icon, `soft` = background, `line` = border): `success` green · `warning` amber · `danger` red · `info` sky. **No hand-written hex/rgba in components.**
- Chart series: `#2563EB`, `#0D9488`, `#EA580C`, `#0891B2`, `#BE185D`, `#65A30D`.

## 4b. Shared UI primitives (use these, don't re-style)
- `components/ui/button-styles.ts` → `btn(variant, size, extra?, pill?)` for `<button>`, `<a>`, `<Link>`; `components/ui/Button.tsx` for the React version (`loading`, `icon`). Variants: primary · secondary · tonal · danger · dangerSoft · ghost. Sizes: sm · md · lg (taller on phones).
- `Toaster` (white card, status icon + left accent, bottom-centre above the phone bar), `Spinner`, `ProgressBar` (determinate / indeterminate, ARIA), `Skeleton` / `CardSkeleton` / `ListSkeleton` / `PageSkeleton` (shimmer), `RouteProgress` (top navigation bar).
- Visual QA: the **Design gallery** page (`/design`; dev or admin) shows colours, type roles, buttons, toasts, loaders and stat cards.

## 5. Layout rules
- Phone chrome budget: top bar 56px + (module tab strip 44px if the module has ≥ 2 pages) + bottom bar 72px. One extra sticky bar at most (e.g. Fulfil All), which sits directly above the bottom bar.
- The top bar already shows the page title on phones — don't repeat it in a header card (`hidden md:block`).
- Tables become card lists on phones (`md:hidden` list + `hidden md:block` table). Max ~7 columns on desktop; merge related fields (ID + copy + link; total + payment; customer + country).
- Filter chips scroll horizontally on phones; tab strips fade at the scrolling edge.

## 6. Verification (run before shipping UI changes)
Automated: Playwright at 360 / 390 / 768 / 1280 px with axe-core (WCAG 2.2 AA) plus checks for horizontal overflow, text < 12px and targets < 24px — see the QA script description in the PR. Then a manual pass on a real iPhone (Safari) and Android (Chrome), including the installed PWA.
