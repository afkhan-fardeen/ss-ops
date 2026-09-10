Seissense Ops Portal — design & motion guidelines

Stack: Next.js 14 (App Router), Tailwind, Supabase, lucide-react, Framer Motion.
This doc is the source of truth for color, type, motion, and where the "living glass" treatment applies vs where the app stays flat and fast.


1. Principle: two modes, not one

The launcher is a moment. The module pages are a workbench. Don't apply the same visual weight to both.

Launcher / empty states / modalsCOD, Fulfillment, Stock pagesSurfaceFrosted glass, blurFlat, opaque, bg-whiteBackgroundDrifting gradient meshStatic neutralMotionCursor-tracked, tilt, staggerState-driven only (row in/out, tab switch)WhyLow-stakes, first impressionHigh-density, needs to be scannable and fast

If you're ever unsure whether a page should get glass: if it has a table with more than ~10 rows, it shouldn't.


2. Color tokens

Add to tailwind.config.ts:

ts// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        canvas: '#F6F4EE',
        ink: '#1E1D1A',
        muted: 'rgba(30,29,26,0.55)',
        line: 'rgba(30,29,26,0.15)',
        cod: {
          DEFAULT: '#2F9E7F',
          bg: 'rgba(47,158,127,0.15)',
          bloom: '#9FDCCB',
        },
        fulfillment: {
          DEFAULT: '#C4553A',
          bg: 'rgba(196,85,58,0.15)',
          bloom: '#F0AE96',
        },
        stock: {
          DEFAULT: '#6B8A3E',
          bg: 'rgba(107,138,62,0.15)',
          bloom: '#F0CE7E',
        },
        gold: '#B8842E',
      },
      backdropBlur: {
        glass: '28px',
      },
      borderRadius: {
        card: '20px',
      },
    },
  },
};

Rule: module color always maps the same way — cod = teal-green, fulfillment = rust, stock = olive-gold. Never reassign these per-page. Sidebar, cards, tab pills, buttons, status dots all pull from the same three tokens so the whole app reads as one system.


3. Typography

Use next/font/google — not a CSS @import — so fonts are self-hosted and don't block render:

ts// app/fonts.ts
import { Sora, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';

export const sora = Sora({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-display',
});

export const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-body',
});

export const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['300', '400'],
  variable: '--font-mono',
});

tsx// app/layout.tsx
<html className={`${sora.variable} ${jakarta.variable} ${mono.variable}`}>

css/* globals.css */
body { font-family: var(--font-body), sans-serif; }

Weight rule: nothing above 500, anywhere. Sora 300 for greetings/large headings, 400 for card titles, Plus Jakarta Sans 400 for body, 300 for secondary/muted text, JetBrains Mono 300–400 for every number, ID, timestamp, and currency figure — FX rates, tracking numbers, BHD totals, order counts all go through the mono face for alignment and to visually mark them as data.


4. Glass component

One shared component, used only where Section 1 says glass applies:

tsx// components/ui/glass-card.tsx
import { motion } from 'framer-motion';
import { useState } from 'react';

export function GlassCard({ children, className = '', onClick }: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const [pos, setPos] = useState({ x: 50, y: 50 });

  return (
    <motion.div
      onClick={onClick}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      whileHover={{ y: -4 }}
      transition={spring}
      className={`relative rounded-card border border-white/70 bg-white/55 backdrop-blur-glass shadow-[0_8px_30px_rgba(120,100,60,0.12)] ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-card opacity-0 transition-opacity duration-300 hover:opacity-100"
        style={{ background: `radial-gradient(circle 180px at ${pos.x}px ${pos.y}px, rgba(255,255,255,0.55), transparent 70%)` }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

Don't rebuild the blur/border/shadow combination ad hoc elsewhere — every glass surface in the app (launcher cards, modal backdrops, the empty-state panel) imports this one component.


5. Icons

You're on lucide-react, not Tabler — fixed mapping, don't mix icon sets on the same screen:

ModuleIconCODWallet or CoinsFulfillmentTruckStock balanceWarehouseUbex statusRadio (for the live dot, animate opacity, don't use a spinner)Store switcherStore


6. Motion

Shared config — one file, reused everywhere

ts// lib/motion.ts
export const spring = { type: 'spring', stiffness: 300, damping: 30 } as const;
export const easeOut = { duration: 0.4, ease: [0.16, 1, 0.3, 1] } as const;

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
export const staggerItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: easeOut },
};

Never inline a bespoke transition={{ duration: 0.37, ease: 'easeInOut' }} — pull from lib/motion.ts or add to it. One motion "hand" across the app.

Reduced motion — set once, globally

tsx// app/layout.tsx
import { MotionConfig } from 'framer-motion';

<MotionConfig reducedMotion="user">
  {children}
</MotionConfig>

Nothing else needs to check prefers-reduced-motion manually.

Launcher → module page transition

Use layoutId so the clicked card becomes the page header — this is the one animation worth the engineering effort:

tsx// launcher card
<motion.div layoutId={`module-${id}`}>
  <motion.div layoutId={`icon-${id}`}><Wallet /></motion.div>
  <motion.h3 layoutId={`title-${id}`}>COD list</motion.h3>
</motion.div>

// module page header, same layoutId
<motion.div layoutId={`module-${id}`} className="page-header">
  <motion.div layoutId={`icon-${id}`}><Wallet /></motion.div>
  <motion.h1 layoutId={`title-${id}`}>COD list</motion.h1>
</motion.div>

Both trees need to exist inside the same <AnimatePresence mode="popLayout"> boundary — put that in the shared shell layout, not per-page.

Table rows that leave when state changes

For Fulfillment, when a push succeeds — don't just re-fetch and snap the table. Animate the row out and let the rest reflow:

tsx<AnimatePresence>
  {orders.map((o) => (
    <motion.tr key={o.id} layout exit={{ opacity: 0, x: 40, height: 0 }}>
      ...
    </motion.tr>
  ))}
</AnimatePresence>

This one is functional, not decorative — for an ops tool where people bulk-push, the row leaving is the confirmation.

Store-switcher tab pill

tsx<button onClick={() => setActive(store.id)} className="relative px-4 py-2">
  {store.name}
  {active === store.id && (
    <motion.div layoutId="store-pill" className="absolute inset-0 rounded-full bg-white/70" transition={spring} />
  )}
</button>

Same layoutId pattern powers the sidebar's active-section indicator — don't build a second version of this.

What NOT to animate


Table cell content on every re-render (only animate row enter/exit, never cell value changes — flickering numbers erode trust in an ops tool)
Anything inside Stock Balance's comparison table — admin needs to scan numbers fast, not watch them settle
Sidebar collapse/expand beyond a simple width transition — no bounce, no overshoot, it's used dozens of times a day and needs to feel instant



7. Route structure

app/
  (launcher)/
    dashboard/
      page.tsx          # no sidebar, no topbar — this layout group
      layout.tsx         # deliberately minimal, just <MotionConfig> + centered shell
    dashboard/analytics/
      page.tsx           # old KPI/chart view lives here now
  (shell)/
    layout.tsx           # sidebar + topbar, used by all module pages
    cod/list/page.tsx
    fulfillment/page.tsx
    stock-balance/page.tsx

Two Next.js route groups, two layouts — don't try to conditionally hide the sidebar with CSS inside one shared layout. Keep them structurally separate so the launcher genuinely has zero sidebar/topbar markup to strip out.


8. Quick reference — do / don't

DoDon'tPull colors from the three module tokensReach for a random blue/red/green per componentRoute numbers through font-monoLet FX rates/tracking IDs render in the body fontUse GlassCard for launcher, modals, empty statesPut glass on the fulfillment table or stock gridReuse spring / easeOut from lib/motion.tsHand-write a new easing curve per componentAnimate row exit on state change (fulfillment push)Animate cell values changing on every pollKeep font weights at 300–500Reach for 600/700 "just to make it pop"