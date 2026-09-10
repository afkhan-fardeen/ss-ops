"use client";

import { motion } from "framer-motion";
import { spring } from "@/lib/motion";

/**
 * Shared frosted-glass surface — launcher cards, modal backdrops, empty-state panels.
 * Per design-plan.md Section 1, glass is reserved for low-stakes / first-impression
 * surfaces only. Never used on dense data screens (tables, comparison grids).
 * Flat translucency + a crisp border — no gradient glow, no color wash.
 */
export function GlassCard({
  children,
  className = "",
  onClick,
  layoutId,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  layoutId?: string;
}) {
  return (
    <motion.div
      layoutId={layoutId}
      onClick={onClick}
      whileHover={{ y: -4 }}
      transition={spring}
      className={`relative rounded-card border border-line bg-white/70 backdrop-blur-glass shadow-glass ${className}`}
    >
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
