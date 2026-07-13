"use client";

import { LayoutGroup, MotionConfig } from "framer-motion";

/**
 * Root-level motion context — persists across every navigation because it lives
 * in the never-unmounting app/layout.tsx. Two responsibilities:
 *  - MotionConfig: global prefers-reduced-motion handling (no per-component checks needed).
 *  - LayoutGroup: lets a `layoutId` on the launcher's module card animate into the
 *    matching `layoutId` on a module page header even though the launcher and the
 *    module page live in separate Next.js route groups with separate layouts —
 *    both still render as descendants of this persistent group.
 *
 * Deliberately NOT wrapping children in <AnimatePresence> here: that would replay
 * an enter/exit animation on the entire page tree for every single navigation in
 * the app, which contradicts the "flat and fast" workbench principle. AnimatePresence
 * is used locally instead, scoped to the few surfaces that need it (row exits,
 * launcher stagger-in, store-switcher pill).
 */
export function MotionProviders({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id="ss-ops">{children}</LayoutGroup>
    </MotionConfig>
  );
}
