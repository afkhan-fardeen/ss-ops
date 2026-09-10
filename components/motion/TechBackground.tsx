/**
 * Shared "alive" backdrop for the login screen and the launcher — a crisp fine
 * grid, a slow accent-colored scanline sweep, and a handful of pulsing node dots.
 * Deliberately no blur or color-blob wash: flat, precise, no gradients.
 */
const NODES: { top: string; left: string; color: string; delay: string }[] = [
  { top: "18%", left: "12%", color: "#2F9E7F", delay: "0s" },
  { top: "72%", left: "8%", color: "#6B4FA2", delay: "1.1s" },
  { top: "24%", left: "88%", color: "#B8842E", delay: "0.6s" },
  { top: "80%", left: "84%", color: "#2F9E7F", delay: "1.8s" },
  { top: "50%", left: "94%", color: "#6B4FA2", delay: "2.3s" },
];

export function TechBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#FAFAF9]" aria-hidden="true">
      <div className="tech-grid-layer" />
      <div className="tech-scanline" style={{ background: "#2F9E7F", boxShadow: "0 0 10px 1px rgba(47,158,127,0.5)" }} />
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
  );
}
