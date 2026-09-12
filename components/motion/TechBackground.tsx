"use client";

import { useEffect, useRef } from "react";

/**
 * Shared "alive" backdrop for the login screen and the launcher — a crisp fine
 * grid, a slow accent-colored scanline sweep, and a handful of pulsing node dots.
 * Deliberately no blur or color-blob wash: flat, precise, no gradients.
 *
 * The grid+nodes layer gets a gentle cursor-reactive nudge (a few px, via direct
 * style mutation on a ref so it doesn't trigger React re-renders on mousemove) —
 * enough to read as a responsive instrument panel, not a decorative parallax toy.
 */
const NODES: { top: string; left: string; color: string; delay: string }[] = [
  { top: "18%", left: "12%", color: "#2F9E7F", delay: "0s" },
  { top: "72%", left: "8%", color: "#6B4FA2", delay: "1.1s" },
  { top: "24%", left: "88%", color: "#B8842E", delay: "0.6s" },
  { top: "80%", left: "84%", color: "#2F9E7F", delay: "1.8s" },
  { top: "50%", left: "94%", color: "#6B4FA2", delay: "2.3s" },
];

export function TechBackground() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    function onMove(e: MouseEvent) {
      const xRatio = e.clientX / window.innerWidth - 0.5;
      const yRatio = e.clientY / window.innerHeight - 0.5;
      const el = layerRef.current;
      if (!el) return;
      el.style.transform = `translate3d(${xRatio * -10}px, ${yRatio * -10}px, 0)`;
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#FAFAF9]" aria-hidden="true">
      <div ref={layerRef} className="absolute -inset-4 transition-transform duration-500 ease-out">
        <div className="tech-grid-layer" />
        {NODES.map((node, i) => (
          <span
            key={i}
            className="tech-node"
            style={
              {
                top: node.top,
                left: node.left,
                background: node.color,
                color: node.color,
                "--node-delay": node.delay,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <div className="tech-scanline" style={{ background: "#2F9E7F", boxShadow: "0 0 10px 1px rgba(47,158,127,0.5)" }} />
    </div>
  );
}
