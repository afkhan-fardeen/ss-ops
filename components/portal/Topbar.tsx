"use client";

import { usePathname } from "next/navigation";

const titles: Record<string, string> = {
  "/cod-list":    "COD List",
  "/fulfillment": "Fulfillment",
  "/history":     "History",
  "/account":     "Account",
};

const sections: Record<string, string> = {
  "/cod-list":    "Tools",
  "/fulfillment": "Tools",
  "/history":     "Tools",
  "/account":     "Settings",
};

export function Topbar() {
  const pathname = usePathname();
  const title   = titles[pathname]   ?? "Portal";
  const section = sections[pathname] ?? "";
  const today   = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day:     "numeric",
    month:   "short",
    year:    "numeric",
  });

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-[#EBEBEB] bg-white px-4 md:px-8">
      <div className="flex items-center gap-2 pl-12 md:pl-0">
        {section && (
          <>
            <span className="text-[12px] font-medium text-[#999999]">{section}</span>
            <span className="text-[#EBEBEB]">/</span>
          </>
        )}
        <h1 className="text-[14px] font-semibold text-[#111111]">{title}</h1>
      </div>
      <span className="hidden font-mono text-[11px] text-[#999999] sm:inline">{today}</span>
    </header>
  );
}
