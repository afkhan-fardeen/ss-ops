"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { spring } from "@/lib/motion";
import {
  getNavOpenKey,
  isNavItemActive,
  type ModuleAccent,
  type ModuleNavItem,
  type NavSectionId,
} from "@/config/modules";
import { StockErrorsNavBadge } from "@/components/stock/StockErrorsCountProvider";
import { readPersistedBoolean, writePersistedBoolean } from "@/lib/browser/persisted-boolean";

type NavCollapsibleItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  aliases?: string[];
};

type Props = {
  sectionId: NavSectionId;
  label: string;
  icon?: LucideIcon;
  accent: ModuleAccent;
  homeHref?: string;
  items: NavCollapsibleItem[];
  collapsed: boolean;
  isActive?: (pathname: string) => boolean;
  /** Skip the collapse/expand toggle and always render items expanded — used when this is the only section shown (current module in context). */
  forceOpen?: boolean;
  /** Open state to fall back to when there's no stored preference and the section isn't active. Defaults to true (existing Settings/Account behavior). */
  defaultOpen?: boolean;
};

function readStoredOpen(sectionId: NavSectionId, defaultOpen: boolean): boolean {
  return readPersistedBoolean(getNavOpenKey(sectionId), defaultOpen);
}

function NavChildLink({
  item,
  accent,
  active,
}: {
  item: NavCollapsibleItem;
  accent: ModuleAccent;
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={[
        "group relative flex items-center gap-3 rounded-lg py-2 pl-4 pr-3 text-[13px] font-medium transition-colors",
        active ? "bg-canvas text-ink" : "text-muted hover:bg-canvas hover:text-ink",
      ].join(" ")}
    >
      {active ? (
        <motion.span
          layoutId="sidebar-active-rail"
          transition={spring}
          className={`absolute inset-y-1.5 left-0 w-[3px] rounded-r ${accent.rail}`}
          aria-hidden
        />
      ) : null}
      <Icon size={16} strokeWidth={2} />
      <span className="flex-1">{item.label}</span>
      <StockErrorsNavBadge href={item.href} />
    </Link>
  );
}

export function NavCollapsibleSection({
  sectionId,
  label,
  icon: SectionIcon,
  accent,
  homeHref,
  items,
  collapsed,
  isActive: isActiveProp,
  forceOpen = false,
  defaultOpen = true,
}: Props) {
  const pathname = usePathname();
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const childActive = useCallback(
    (p: string) => items.some((item) => isNavItemActive(p, item as ModuleNavItem)),
    [items],
  );

  const sectionActive = isActiveProp ? isActiveProp(pathname) : childActive(pathname);

  const [open, setOpen] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const shouldOpen = sectionActive || readStoredOpen(sectionId, defaultOpen);
    setOpen(shouldOpen);
  }, [pathname, sectionId, sectionActive, defaultOpen]);

  const updateMenuPos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 0;
    const top = Math.min(r.top, window.innerHeight - menuHeight - 8);
    setMenuPos({ top: Math.max(8, top), left: r.right + 8 });
  }, []);

  useLayoutEffect(() => {
    if (!popoverOpen) return;
    updateMenuPos();
  }, [popoverOpen, updateMenuPos]);

  useEffect(() => {
    if (!popoverOpen) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setPopoverOpen(false);
    }
    function onScrollOrResize() {
      updateMenuPos();
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [popoverOpen, updateMenuPos]);

  const persistOpen = useCallback(
    (next: boolean) => {
      setOpen(next);
      writePersistedBoolean(getNavOpenKey(sectionId), next);
    },
    [sectionId],
  );

  const toggle = useCallback(() => persistOpen(!open), [open, persistOpen]);
  const effectiveOpen = forceOpen || open;

  if (collapsed) {
    return (
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          title={label}
          onClick={() => setPopoverOpen((v) => !v)}
          className={[
            "flex w-full justify-center rounded-lg p-2 transition-colors",
            sectionActive || popoverOpen ? "bg-canvas text-ink" : "text-muted hover:bg-canvas hover:text-ink",
          ].join(" ")}
        >
          {SectionIcon ? <SectionIcon size={18} /> : null}
        </button>
        {mounted && popoverOpen
          ? createPortal(
              <div
                ref={menuRef}
                role="menu"
                className="fixed z-50 min-w-[200px] rounded-card border border-line bg-white py-2 shadow-[0_8px_30px_rgba(15,23,42,0.12)]"
                style={{ top: menuPos.top, left: menuPos.left }}
              >
                <p className="border-b border-line px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
                  {label}
                </p>
                <nav className="flex flex-col gap-0.5 p-1.5">
                  {items.map((item) => {
                    const active = isNavItemActive(pathname, item as ModuleNavItem);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setPopoverOpen(false)}
                        className={[
                          "relative flex items-center gap-2 rounded-lg py-2 pl-3 pr-2.5 text-[13px] font-medium transition-colors",
                          active ? "bg-canvas text-ink" : "text-muted hover:bg-canvas hover:text-ink",
                        ].join(" ")}
                      >
                        {active ? (
                          <span
                            className={`absolute inset-y-1.5 left-0 w-[3px] rounded-r ${accent.rail}`}
                            aria-hidden
                          />
                        ) : null}
                        <item.icon size={15} />
                        <span className="flex-1">{item.label}</span>
                        <StockErrorsNavBadge href={item.href} />
                      </Link>
                    );
                  })}
                </nav>
              </div>,
              document.body,
            )
          : null}
      </div>
    );
  }

  return (
    <div>
      <div
        className={[
          "flex w-full items-center gap-1 rounded-lg transition-colors",
          sectionActive ? "bg-canvas" : "hover:bg-canvas",
        ].join(" ")}
      >
        {homeHref ? (
          <Link
            href={homeHref}
            className={[
              "focus-ring flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-[12px] font-medium tracking-wide transition-colors",
              sectionActive ? "text-ink" : "text-muted",
            ].join(" ")}
          >
            {SectionIcon ? <SectionIcon size={15} strokeWidth={2.2} /> : null}
            <span className="truncate">{label}</span>
          </Link>
        ) : (
          <span
            className={[
              "flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-[12px] font-medium tracking-wide",
              sectionActive ? "text-ink" : "text-muted",
            ].join(" ")}
          >
            {SectionIcon ? <SectionIcon size={15} strokeWidth={2.2} /> : null}
            <span className="truncate">{label}</span>
          </span>
        )}
        {forceOpen ? null : (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-controls={panelId}
            className="focus-ring mr-1 shrink-0 rounded-md p-1 text-muted transition-colors hover:text-ink"
            aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>
      <div
        id={panelId}
        className={[
          "grid transition-[grid-template-rows] duration-200 ease-out",
          effectiveOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        ].join(" ")}
      >
        <nav className="overflow-hidden">
          <div className="mt-0.5 flex flex-col gap-0.5 pl-1">
            {items.map((item) => (
              <NavChildLink
                key={item.href}
                item={item}
                accent={accent}
                active={isNavItemActive(pathname, item as ModuleNavItem)}
              />
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

export function NavHomeLink({
  href,
  label,
  icon: Icon,
  accent,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  accent: ModuleAccent;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={[
        "group relative flex items-center gap-3 rounded-lg py-2 text-[13px] font-medium transition-colors",
        collapsed ? "justify-center px-2" : "px-3",
        active ? "bg-canvas text-ink" : "text-muted hover:bg-canvas hover:text-ink",
      ].join(" ")}
    >
      {active && !collapsed ? (
        <motion.span
          layoutId="sidebar-active-rail"
          transition={spring}
          className={`absolute inset-y-1.5 left-0 w-[3px] rounded-r ${accent.rail}`}
          aria-hidden
        />
      ) : null}
      <Icon size={16} strokeWidth={active ? 2.2 : 2} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}
