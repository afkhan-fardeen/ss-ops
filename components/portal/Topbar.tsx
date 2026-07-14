"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { CodListFloatingActions } from "@/components/cod-list/CodListFloatingActions";
import { isCodListPath, resolveRouteMeta } from "@/config/modules";
import { AstClock } from "./AstClock";
import { UbexIndicator } from "./UbexIndicator";
import { RestockStatusIndicator } from "./RestockStatusIndicator";

export function Topbar() {
  const pathname = usePathname();
  const meta = resolveRouteMeta(pathname);

  return (
    <header className="sticky top-0 z-10 flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line bg-white/90 px-4 py-1.5 backdrop-blur-sm md:px-6">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-2 sm:gap-3">
        {meta.moduleLabel && meta.accent ? (
          <>
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${meta.accent.pillBg} ${meta.accent.pillText}`}
            >
              {meta.moduleLabel}
            </span>
            <span className="text-line">/</span>
          </>
        ) : null}
        <h1 className="shrink-0 font-display text-[14px] font-medium text-ink">{meta.title}</h1>
        {isCodListPath(pathname) ? (
          <Suspense fallback={null}>
            <div className="min-w-0 pl-0 sm:pl-1">
              <CodListFloatingActions />
            </div>
          </Suspense>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <RestockStatusIndicator />
        <UbexIndicator />
        <AstClock />
      </div>
    </header>
  );
}
