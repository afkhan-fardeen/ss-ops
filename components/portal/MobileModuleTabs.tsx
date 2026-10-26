"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getPortalModules, isNavItemActive, resolveRouteMeta } from "@/config/modules";

/**
 * Horizontally scrollable sub-page tabs for the current module (Dashboard / List / History / Settings…).
 * Mobile only — on desktop the sidebar already shows these. A fade on the right edge signals more tabs.
 */
export function MobileModuleTabs() {
  const pathname = usePathname();
  const { moduleId } = resolveRouteMeta(pathname);
  const mod = moduleId ? getPortalModules(true).find((m) => m.id === moduleId) : undefined;
  const scroller = useRef<HTMLUListElement>(null);
  const [moreRight, setMoreRight] = useState(false);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () => setMoreRight(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    // Bring the active tab into view when it is off-screen.
    el.querySelector<HTMLElement>("[aria-current=page]")?.scrollIntoView({ inline: "center", block: "nearest" });
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname, mod?.id]);

  if (!mod || mod.items.length < 2) return null;

  return (
    <nav aria-label={`${mod.label} pages`} className="relative border-b border-line bg-white md:hidden">
      <ul ref={scroller} className="no-scrollbar flex gap-1 overflow-x-auto px-3">
        {mod.items.map((item) => {
          const active = isNavItemActive(pathname, item);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "relative flex min-h-11 items-center px-3 text-body font-medium",
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
      {moreRight ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent"
        />
      ) : null}
    </nav>
  );
}
