"use client";

import { useEffect, useRef } from "react";

type BlobId = "teal" | "purple" | "gold";

/** Mouse-nudge strength per blob (px) — kept different so they don't move in lockstep. */
const STRENGTH: Record<BlobId, number> = {
  teal: 26,
  purple: 20,
  gold: 16,
};

/**
 * Full-bleed dark hero background for the login screen — three large, saturated,
 * slow-drifting gradient blobs plus a film-grain overlay. Deliberately more dramatic
 * than the everyday app's MeshBackground: this is the one "wow" moment before the
 * flat, fast workbench takes over.
 */
export function LoginAurora() {
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
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0A0A0B]" aria-hidden="true">
      <div
        ref={(el) => {
          refs.current.teal = el ?? undefined;
        }}
        className="aurora-wrap aurora-pos-teal"
      >
        <div className="aurora-blob aurora-teal animate-aurora-teal" />
      </div>
      <div
        ref={(el) => {
          refs.current.purple = el ?? undefined;
        }}
        className="aurora-wrap aurora-pos-purple"
      >
        <div className="aurora-blob aurora-purple animate-aurora-purple" />
      </div>
      <div
        ref={(el) => {
          refs.current.gold = el ?? undefined;
        }}
        className="aurora-wrap aurora-pos-gold"
      >
        <div className="aurora-blob aurora-gold animate-aurora-gold" />
      </div>
      <div className="aurora-grain" />
    </div>
  );
}
