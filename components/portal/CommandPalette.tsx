"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft, type LucideIcon } from "lucide-react";
import { getPortalModules, HOME_HREF, moduleDashboardHref } from "@/config/modules";
import { getSettingsNavItems } from "@/config/navigation";
import { Home as HomeIcon } from "lucide-react";

const OPEN_EVENT = "ss-ops:open-command-palette";

/** Trigger the command palette from anywhere (Topbar button, dashboard search field, etc). */
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type CommandItem = {
  id: string;
  label: string;
  group: string;
  href: string;
  icon: LucideIcon;
};

function buildItems(allowedModuleIds: string[], showAdminLink: boolean): CommandItem[] {
  const items: CommandItem[] = [
    { id: "home", label: "Home", group: "Portal", href: HOME_HREF, icon: HomeIcon },
  ];

  const modules = getPortalModules(true).filter((m) => allowedModuleIds.includes(m.id));
  for (const mod of modules) {
    items.push({
      id: `${mod.id}:home`,
      label: mod.label,
      group: "",
      href: moduleDashboardHref(mod),
      icon: mod.icon,
    });
    for (const navItem of mod.items) {
      if (navItem.href === moduleDashboardHref(mod)) continue;
      items.push({
        id: `${mod.id}:${navItem.href}`,
        label: navItem.label,
        group: mod.label,
        href: navItem.href,
        icon: navItem.icon,
      });
    }
  }

  for (const settingsItem of getSettingsNavItems(showAdminLink)) {
    items.push({
      id: `settings:${settingsItem.href}`,
      label: settingsItem.label,
      group: "Settings",
      href: settingsItem.href,
      icon: settingsItem.icon,
    });
  }

  return items;
}

export function CommandPalette({
  allowedModuleIds,
  showAdminLink,
}: {
  allowedModuleIds: string[];
  showAdminLink: boolean;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allItems = useMemo(
    () => buildItems(allowedModuleIds, showAdminLink),
    [allowedModuleIds, showAdminLink],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(
      (item) => item.label.toLowerCase().includes(q) || item.group.toLowerCase().includes(q),
    );
  }, [allItems, query]);

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    function onOpenEvent() {
      setOpen(true);
    }
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener(OPEN_EVENT, onOpenEvent);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpenEvent);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    return () => {
      document.body.style.overflow = "";
      clearTimeout(t);
    };
  }, [open]);

  useEffect(() => setActiveIndex(0), [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const select = useCallback(
    (item: CommandItem) => {
      close();
      router.push(item.href);
    },
    [close, router],
  );

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[activeIndex];
      if (item) select(item);
    }
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-ink/40 backdrop-blur-[1px]" aria-label="Close" onClick={close} />
      <div className="relative z-10 h-fit w-full max-w-lg overflow-hidden rounded-card border border-line bg-white shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3.5">
          <Search size={17} className="shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Jump to a module or page…"
            className="w-full min-w-0 border-0 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
          />
          <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] font-medium text-muted sm:inline-block">
            Esc
          </kbd>
        </div>
        <div ref={listRef} className="max-h-[min(60vh,420px)] overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-muted">No matches.</p>
          ) : (
            filtered.map((item, i) => {
              const Icon = item.icon;
              const active = i === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-index={i}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => select(item)}
                  className={[
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors",
                    active ? "bg-canvas text-ink" : "text-ink",
                  ].join(" ")}
                >
                  <Icon size={16} className="shrink-0 text-muted" />
                  <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                  <span className="shrink-0 text-[11px] text-muted">{item.group}</span>
                  {active ? <CornerDownLeft size={13} className="shrink-0 text-muted" /> : null}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
