/**
 * Shared flat backdrop for the login screen and the launcher — a crisp fine
 * grid, static. No motion, no scanline, no gradients: matches the restraint
 * of the login split-screen (components/auth/LoginHero.tsx).
 */
export function TechBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#FAFAF9]" aria-hidden="true">
      <div className="tech-grid-layer" />
    </div>
  );
}
