"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import {
  getNavOpenKey,
  isNavItemActive,
  type ModuleAccent,
  type ModuleNavItem,
  type NavSectionId,
} from "@/config/modules";

export type NavCollapsibleItem = {
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
};

function readStoredOpen(sectionId: NavSectionId, defaultOpen: boolean): boolean {
  try {
    const v = window.localStorage.getItem(getNavOpenKey(sectionId));
    if (v === "0") return false;
    if (v === "1") return true;
  } catch { /* ignore */ }
  return defaultOpen;
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
        active
          ? `${accent.activeBg} ${accent.activeText}`
          : "text-[#999999] hover:bg-[#F7F7F7] hover:text-[#111111]",
      ].join(" ")}
    >
      {active ? (
        <span
          className={`absolute inset-y-1.5 left-0 w-[3px] rounded-r ${accent.rail}`}
          aria-hidden
        />
      ) : null}
      <Icon size={16} strokeWidth={2} />
      <span className="flex-1">{item.label}</span>
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
}: Props) {
  const pathname = usePathname();
  const panelId = useId();
  const popoverRef = useRef<HTMLDivElement>(null);

  const childActive = useCallback(
    (p: string) => items.some((item) => isNavItemActive(p, item as ModuleNavItem)),
    [items],
  );

  const sectionActive = isActiveProp ? isActiveProp(pathname) : childActive(pathname);

  const [open, setOpen] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    const shouldOpen = sectionActive || readStoredOpen(sectionId, true);
    setOpen(shouldOpen);
  }, [pathname, sectionId, sectionActive]);

  useEffect(() => {
    if (!popoverOpen) return;
    function onDoc(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [popoverOpen]);

  const persistOpen = useCallback(
    (next: boolean) => {
      setOpen(next);
      try {
        window.localStorage.setItem(getNavOpenKey(sectionId), next ? "1" : "0");
      } catch { /* ignore */ }
    },
    [sectionId],
  );

  const toggle = useCallback(() => persistOpen(!open), [open, persistOpen]);

  if (collapsed) {
    return (
      <div className="relative" ref={popoverRef}>
        <button
          type="button"
          title={label}
          onClick={() => setPopoverOpen((v) => !v)}
          className={[
            "flex w-full justify-center rounded-lg p-2 transition-colors",
            sectionActive || popoverOpen ? accent.activeBg : `hover:bg-[#F7F7F7] ${accent.labelHover}`,
          ].join(" ")}
        >
          {SectionIcon ? (
            <SectionIcon
              size={18}
              className={sectionActive ? accent.activeText : accent.labelText}
            />
          ) : null}
        </button>
        {popoverOpen ? (
          <div
            className="absolute left-full top-0 z-50 ml-2 min-w-[200px] rounded-card border border-[#EBEBEB] bg-white py-2 shadow-[0_8px_30px_rgba(15,23,42,0.12)]"
            role="menu"
          >
            <p
              className={`border-b border-[#EBEBEB] px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider ${accent.activeText}`}
            >
              {label}
            </p>
            <nav className="flex flex-col gap-0.5 p-1.5">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setPopoverOpen(false)}
                  className={[
                    "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                    isNavItemActive(pathname, item as ModuleNavItem)
                      ? `${accent.activeBg} ${accent.activeText}`
                      : "text-[#555555] hover:bg-[#F7F7F7]",
                  ].join(" ")}
                >
                  <item.icon size={15} />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div
        className={[
          "flex w-full items-center gap-1 rounded-lg transition-colors",
          sectionActive ? accent.activeBg : accent.labelHover,
        ].join(" ")}
      >
        {homeHref ? (
          <Link
            href={homeHref}
            className={[
              "focus-ring flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-[12px] font-semibold tracking-wide transition-colors",
              sectionActive ? accent.activeText : accent.labelText,
            ].join(" ")}
          >
            {SectionIcon ? <SectionIcon size={15} strokeWidth={2.2} /> : null}
            <span className={`h-2 w-2 shrink-0 rounded-full ${accent.rail}`} aria-hidden />
            <span className="truncate">{label}</span>
          </Link>
        ) : (
          <span
            className={[
              "flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-[12px] font-semibold tracking-wide",
              sectionActive ? accent.activeText : accent.labelText,
            ].join(" ")}
          >
            {SectionIcon ? <SectionIcon size={15} strokeWidth={2.2} /> : null}
            <span className={`h-2 w-2 shrink-0 rounded-full ${accent.rail}`} aria-hidden />
            <span className="truncate">{label}</span>
          </span>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={panelId}
          className={`focus-ring mr-1 shrink-0 rounded-md p-1 ${sectionActive ? accent.activeText : accent.labelText}`}
          aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
        >
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      <div
        id={panelId}
        className={[
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
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
        "group relative flex items-center gap-3 rounded-lg py-2 text-[13px] font-semibold transition-colors",
        collapsed ? "justify-center px-2" : "px-3",
        active
          ? `${accent.activeBg} ${accent.activeText}`
          : `${accent.labelText} ${accent.labelHover}`,
      ].join(" ")}
    >
      {active && !collapsed ? (
        <span
          className={`absolute inset-y-1.5 left-0 w-[3px] rounded-r ${accent.rail}`}
          aria-hidden
        />
      ) : null}
      <Icon size={16} strokeWidth={active ? 2.2 : 2} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}
