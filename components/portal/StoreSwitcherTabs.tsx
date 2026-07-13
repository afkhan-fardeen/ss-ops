"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type StoreTab = {
  id: string;
  label: string;
};

const STORE_TABS: StoreTab[] = [
  { id: "1", label: "Store 1 (BH)" },
  { id: "2", label: "Store 2 (GCC)" },
];

/**
 * Tab strip that switches between stores using the ?store= search param.
 * All other existing search params are preserved when switching tabs.
 * This is a client component so it can read the current URL params reactively.
 */
export function StoreSwitcherTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeStore = searchParams.get("store") ?? "1";

  function buildHref(storeId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("store", storeId);
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-[#EBEBEB] bg-[#F7F7F7] p-1">
      {STORE_TABS.map((tab) => {
        const active = activeStore === tab.id;
        return (
          <Link
            key={tab.id}
            href={buildHref(tab.id)}
            className={[
              "inline-flex h-8 items-center rounded-md px-4 text-[12px] font-medium transition-all",
              active
                ? "bg-white text-[#111111] shadow-soft"
                : "text-[#777777] hover:text-[#111111]",
            ].join(" ")}
            aria-selected={active}
            aria-label={`Switch to ${tab.label}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
