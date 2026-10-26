"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { resolveRouteMeta } from "@/config/modules";
import { openCommandPalette } from "@/components/portal/CommandPalette";
import { AstClock } from "./AstClock";
import { UbexIndicator } from "./UbexIndicator";
import { RestockStatusIndicator } from "./RestockStatusIndicator";

export function Topbar() {
  const pathname = usePathname();
  const meta = resolveRouteMeta(pathname);

  return (
    <header className="sticky top-0 z-10 flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line bg-white px-4 py-1.5 md:px-6">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-2 sm:gap-3">
        {meta.moduleLabel && meta.accent ? (
          <>
            <span className="text-[13px] text-muted">{meta.moduleLabel}</span>
            <span className="text-line">/</span>
          </>
        ) : null}
        <h1 className="shrink-0 text-[14px] font-semibold text-ink">{meta.title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={openCommandPalette}
          className="focus-ring hidden items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12px] text-muted transition hover:bg-canvas hover:text-ink sm:flex"
        >
          <Search size={13} />
          <span>Jump to…</span>
          <kbd className="rounded border border-line px-1 text-[10px] font-medium">⌘K</kbd>
        </button>
        <RestockStatusIndicator />
        <UbexIndicator />
        <AstClock />
      </div>
    </header>
  );
}
