"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const titles: Record<string, string> = {
  "/cod-list": "COD List",
  "/fulfillment": "Fulfillment",
  "/reports": "Reports",
  "/account": "Account",
};

const sections: Record<string, string> = {
  "/cod-list": "Tools",
  "/fulfillment": "Tools",
  "/reports": "Tools",
  "/account": "Settings",
};

export function Topbar() {
  const pathname = usePathname();
  const title = titles[pathname] ?? "Portal";
  const section = sections[pathname] ?? "";
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-portal-border bg-portal-bg2/85 px-4 backdrop-blur-md md:px-8">
      <div className="flex items-center gap-2 pl-12 md:pl-0">
        {section ? (
          <>
            <span className="text-[12px] font-medium text-portal-text3">{section}</span>
            <span className="text-portal-text3">/</span>
          </>
        ) : null}
        <h1 className="text-[14px] font-semibold text-portal-text">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden font-mono text-[11px] text-portal-text3 sm:inline">{today}</span>
        <ThemeToggle />
      </div>
    </header>
  );
}
