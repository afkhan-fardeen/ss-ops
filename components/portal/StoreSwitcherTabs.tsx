"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { spring } from "@/lib/motion";
import { STORE_LABELS } from "@/lib/stores/labels";

type StoreTab = {
  id: string;
  label: string;
};

const STORE_TABS: StoreTab[] = [
  { id: "1", label: STORE_LABELS[1] },
  { id: "2", label: STORE_LABELS[2] },
];

/**
 * Tab strip that switches between stores using the ?store= search param.
 * All other existing search params are preserved when switching tabs.
 * This is a client component so it can read the current URL params reactively.
 *
 * The active pill slides between tabs via a shared `layoutId`, namespaced per
 * page (via `namespace`) so a COD store-switcher and a Fulfillment store-switcher
 * never bridge their layout animation if both were ever mounted at once.
 */
export function StoreSwitcherTabs({ namespace = "default" }: { namespace?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeStore = searchParams.get("store") ?? "1";

  function buildHref(storeId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("store", storeId);
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-line bg-canvas p-1">
      {STORE_TABS.map((tab) => {
        const active = activeStore === tab.id;
        return (
          <Link
            key={tab.id}
            href={buildHref(tab.id)}
            className={[
              "relative inline-flex min-h-11 items-center rounded-md px-4 py-2 text-[12px] font-medium transition-colors sm:min-h-0 sm:h-8 sm:py-0",
              active ? "text-ink" : "text-muted hover:text-ink",
            ].join(" ")}
            aria-selected={active}
            aria-label={`Switch to ${tab.label}`}
          >
            {active ? (
              <motion.span
                layoutId={`store-pill-${namespace}`}
                transition={spring}
                className="absolute inset-0 rounded-md bg-white shadow-soft"
                aria-hidden
              />
            ) : null}
            <span className="relative z-10">{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
