/**
 * Single source of truth for motion across the portal. Every Framer Motion
 * transition in the app pulls from here — never hand-write a bespoke easing
 * curve or spring config per component. See design-plan.md Section 6.
 */

export const spring = { type: "spring", stiffness: 300, damping: 30 } as const;

export const easeOut = { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const };

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: easeOut },
};

/** Row exit — used when a table row leaves as the result of a state change (e.g. fulfillment push succeeding). */
export const rowExit = { opacity: 0, x: 40, height: 0 };
