"use client";

import { useEffect, useState } from "react";

const AST_TZ = "Asia/Bahrain";

function formatAst(now: Date) {
  const time = now.toLocaleTimeString("en-GB", {
    timeZone: AST_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = now.toLocaleDateString("en-GB", {
    timeZone: AST_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return { time, date };
}

/**
 * Live Bahrain (AST, UTC+3) clock. Ticks client-side only — renders nothing
 * until mounted to avoid a server/client render mismatch on the initial paint.
 */
export function AstClock({ compact = false }: { compact?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <span className="font-mono text-[11px] text-muted opacity-0">--:--</span>;

  const { time, date } = formatAst(now);

  if (compact) {
    return <span className="font-mono text-[11px] text-muted">{time}</span>;
  }

  return (
    <span className="font-mono text-[11px] text-muted">
      {time} AST <span className="hidden sm:inline">· {date}</span>
    </span>
  );
}
