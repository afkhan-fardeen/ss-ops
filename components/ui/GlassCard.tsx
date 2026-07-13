"use client";

import { motion } from "framer-motion";
import { useRef } from "react";
import { spring } from "@/lib/motion";

/**
 * Shared frosted-glass surface — launcher cards, modal backdrops, empty-state panels.
 * Per design-plan.md Section 1, glass is reserved for low-stakes / first-impression
 * surfaces only. Never used on dense data screens (tables, comparison grids).
 *
 * Cursor-tracked glow uses a ref + direct style mutation (not useState) so the
 * radial-gradient position updates without triggering a React re-render on every
 * mousemove.
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
  const glowRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (glowRef.current) {
      glowRef.current.style.background = `radial-gradient(circle 180px at ${x}px ${y}px, rgba(255,255,255,0.55), transparent 70%)`;
    }
  }

  return (
    <motion.div
      layoutId={layoutId}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      whileHover={{ y: -4 }}
      transition={spring}
      className={`group relative rounded-card border border-white/70 bg-white/55 backdrop-blur-glass shadow-glass ${className}`}
    >
      <div
        ref={glowRef}
        className="pointer-events-none absolute inset-0 rounded-card opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
