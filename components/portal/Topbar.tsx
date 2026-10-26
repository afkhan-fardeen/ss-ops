"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { resolveRouteMeta } from "@/config/modules";
import { openCommandPalette } from "@/components/portal/CommandPalette";
import { MobileModuleTabs } from "./MobileModuleTabs";
import { AstClock } from "./AstClock";
import { UbexIndicator } from "./UbexIndicator";
import { RestockStatusIndicator } from "./RestockStatusIndicator";

export function Topbar() {
  const pathname = usePathname();
  const meta = resolveRouteMeta(pathname);

  return (
    <header className="sticky top-0 z-20 bg-white" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-line px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          {meta.moduleLabel ? (
            <>
              <span className={`hidden text-body font-medium sm:inline ${meta.accent?.labelText ?? "text-muted"}`}>{meta.moduleLabel}</span>
              <span className="hidden text-line sm:inline">/</span>
            </>
          ) : null}
          <h1 className="truncate text-title font-semibold text-ink md:text-heading">{meta.title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label="Search"
            className="focus-ring grid h-10 w-10 place-items-center rounded-control text-muted active:bg-canvas md:hidden"
          >
            <Search size={19} />
          </button>
          <button
            type="button"
            onClick={openCommandPalette}
            className="focus-ring hidden items-center gap-2 rounded-control border border-line bg-white px-3 py-2 text-body-sm text-muted transition hover:bg-canvas hover:text-ink md:flex"
          >
            <Search size={13} />
            <span>Jump to…</span>
            <kbd className="rounded-control border border-line px-1 text-caption font-medium">⌘K</kbd>
          </button>
          <div className="hidden md:block">
            <RestockStatusIndicator />
          </div>
          <UbexIndicator />
          <span className="hidden md:inline">
            <AstClock />
          </span>
        </div>
      </div>
      <MobileModuleTabs />
    </header>
  );
}
