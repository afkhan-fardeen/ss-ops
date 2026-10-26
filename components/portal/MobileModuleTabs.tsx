"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getPortalModules, isNavItemActive, resolveRouteMeta } from "@/config/modules";

/**
 * Horizontally scrollable sub-page tabs for the current module (Dashboard / List / History / Config…).
 * Mobile only — on desktop the sidebar already shows these.
 */
export function MobileModuleTabs() {
  const pathname = usePathname();
  const { moduleId } = resolveRouteMeta(pathname);
  const mod = moduleId ? getPortalModules(true).find((m) => m.id === moduleId) : undefined;
  if (!mod || mod.items.length < 2) return null;

  return (
    <nav aria-label={`${mod.label} pages`} className="border-b border-line bg-white md:hidden">
      <ul className="no-scrollbar flex gap-1 overflow-x-auto px-3">
        {mod.items.map((item) => {
          const active = isNavItemActive(pathname, item);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "relative flex min-h-11 items-center px-3 text-fs14 font-medium",
                  active ? "text-primary" : "text-muted active:text-ink",
                ].join(" ")}
              >
                {item.label}
                {active ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
