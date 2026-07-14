"use client";

import { useEffect, useRef } from "react";

type BlobId = "gold" | "teal" | "coral";

/** Mouse-nudge strength per blob (px) — kept different so they don't move in lockstep. */
const STRENGTH: Record<BlobId, number> = {
  gold: 18,
  teal: 28,
  coral: 22,
};

/**
 * Fixed, site-wide "alive" background — mounted once at the root layout so it
 * never remounts across navigation. Three large blurred blobs drift on their own
 * slow CSS loops and get nudged in real time by cursor position (direct style
 * mutation via refs, not state, to avoid a re-render on every mousemove).
 */
export function MeshBackground() {
  const refs = useRef<Partial<Record<BlobId, HTMLDivElement>>>({});

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    function onMove(e: MouseEvent) {
      const xRatio = e.clientX / window.innerWidth - 0.5;
      const yRatio = e.clientY / window.innerHeight - 0.5;
      for (const id of Object.keys(STRENGTH) as BlobId[]) {
        const el = refs.current[id];
        if (!el) continue;
        const strength = STRENGTH[id];
        el.style.transform = `translate3d(${xRatio * strength}px, ${yRatio * strength}px, 0)`;
      }
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div
        ref={(el) => {
          refs.current.gold = el ?? undefined;
        }}
        className="mesh-blob-wrap mesh-blob-pos-gold"
      >
        <div className="mesh-blob mesh-blob-gold animate-blob-drift-gold" />
      </div>
      <div
        ref={(el) => {
          refs.current.teal = el ?? undefined;
        }}
        className="mesh-blob-wrap mesh-blob-pos-teal"
      >
        <div className="mesh-blob mesh-blob-teal animate-blob-drift-teal" />
      </div>
      <div
        ref={(el) => {
          refs.current.coral = el ?? undefined;
        }}
        className="mesh-blob-wrap mesh-blob-pos-coral"
      >
        <div className="mesh-blob mesh-blob-coral animate-blob-drift-coral" />
      </div>
    </div>
  );
}
