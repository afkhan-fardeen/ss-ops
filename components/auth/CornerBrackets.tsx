"use client";

import { motion } from "framer-motion";

const SIZE = 18;
const OFFSET = -9;

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  show: { pathLength: 1, opacity: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

function Bracket({ corner }: { corner: "tl" | "tr" | "bl" | "br" }) {
  const isTop = corner === "tl" || corner === "tr";
  const isLeft = corner === "tl" || corner === "bl";
  const path = isTop
    ? isLeft
      ? `M1 ${SIZE} V1 H${SIZE}`
      : `M${SIZE - 1} ${SIZE} V1 H1`
    : isLeft
      ? `M1 1 V${SIZE - 1} H${SIZE}`
      : `M${SIZE - 1} 1 V${SIZE - 1} H1`;

  return (
    <svg
      width={SIZE + 1}
      height={SIZE + 1}
      viewBox={`0 0 ${SIZE + 1} ${SIZE + 1}`}
      className={[
        "absolute text-cod",
        corner === "tl" ? "left-0 top-0" : "",
        corner === "tr" ? "right-0 top-0" : "",
        corner === "bl" ? "bottom-0 left-0" : "",
        corner === "br" ? "bottom-0 right-0" : "",
      ].join(" ")}
      style={{
        transform: `translate(${isLeft ? OFFSET : -OFFSET}px, ${isTop ? OFFSET : -OFFSET}px)`,
      }}
      aria-hidden
    >
      <motion.path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        variants={draw}
      />
    </svg>
  );
}

/** Four corner "instrument bracket" marks framing the sign-in card — a precision-tool accent, not decoration. */
export function CornerBrackets() {
  return (
    <>
      <Bracket corner="tl" />
      <Bracket corner="tr" />
      <Bracket corner="bl" />
      <Bracket corner="br" />
    </>
  );
}
