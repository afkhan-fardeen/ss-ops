"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { settingsNav, toolsNav, type NavItem } from "@/config/navigation";

const STORAGE_KEY = "portal.sidebar.collapsed";
const WIDTH_EXPANDED = 240;
const WIDTH_COLLAPSED = 68;

function applySidebarWidth(collapsed: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty(
    "--sb-w",
    `${collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED}px`,
  );
}

function NavLink({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={[
        "group relative flex items-center gap-3 rounded-card py-2 text-sm font-medium transition",
        collapsed ? "justify-center px-2" : "px-3",
        active
          ? "bg-portal-accentSoft text-portal-accent"
          : "text-portal-text2 hover:bg-portal-bg3 hover:text-portal-text",
      ].join(" ")}
    >
      {active ? (
        <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-portal-accent" aria-hidden />
      ) : null}
      <Icon size={16} strokeWidth={2} className={active ? "text-portal-accent" : "text-portal-text3"} />
      {collapsed ? null : (
        <>
          <span className="flex-1">{item.label}</span>
          {item.soon ? (
            <span className="rounded bg-portal-bg3 px-1.5 py-0.5 text-[10px] font-medium text-portal-text3">
              Soon
            </span>
          ) : null}
        </>
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  // Sync width to :root whenever collapsed flips.
  useEffect(() => {
    applySidebarWidth(collapsed);
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore storage errors (private mode, etc.) */
    }
  }, [collapsed]);

  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);

  // Cmd/Ctrl+B keyboard shortcut.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "b" || e.key === "B")) {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        toggleCollapsed();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCollapsed]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const width = collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED;

  return (
    <>
      <button
        type="button"
        className="focus-ring fixed left-4 top-4 z-40 inline-flex h-9 w-9 items-center justify-center rounded-card border border-portal-border bg-portal-bg2 text-portal-text md:hidden"
        onClick={() => setMobileOpen((v) => !v)}
        aria-expanded={mobileOpen}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? <X size={16} /> : <Menu size={16} />}
      </button>
      <aside
        style={{ width }}
        className={[
          "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-portal-border bg-portal-bg2 py-5 transition-[width,transform] duration-200 md:translate-x-0",
          collapsed ? "px-2" : "px-3",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <div className={collapsed ? "px-1" : "px-2"}>
          {collapsed ? (
            <div className="grid h-8 w-full place-items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-portal-accent" aria-hidden />
            </div>
          ) : (
            <div className="font-display text-[15px] font-semibold tracking-tight text-portal-text">
              Ops Portal
            </div>
          )}
        </div>

        <div className="mt-6 space-y-5 overflow-y-auto">
          <div>
            {collapsed ? null : (
              <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-portal-text3">
                Tools
              </div>
            )}
            <nav className="mt-2 flex flex-col gap-1">
              {toolsNav.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={pathname === item.href}
                  collapsed={collapsed}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </nav>
          </div>

          <div>
            {collapsed ? null : (
              <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-portal-text3">
                Settings
              </div>
            )}
            <nav className="mt-2 flex flex-col gap-1">
              {settingsNav.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={pathname === item.href}
                  collapsed={collapsed}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-auto space-y-2 border-t border-portal-border pt-3">
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar (⌘B)" : "Collapse sidebar (⌘B)"}
            className={[
              "focus-ring hidden w-full items-center gap-2 rounded-card py-2 text-sm font-medium text-portal-text2 transition hover:bg-portal-bg3 hover:text-portal-text md:flex",
              collapsed ? "justify-center px-2" : "px-3",
            ].join(" ")}
          >
            {collapsed ? (
              <PanelLeftOpen size={16} strokeWidth={2} />
            ) : (
              <>
                <PanelLeftClose size={16} strokeWidth={2} />
                <span>Collapse</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            title={collapsed ? "Sign out" : undefined}
            className={[
              "focus-ring flex w-full items-center gap-2 rounded-card py-2 text-sm font-medium text-portal-text2 transition hover:bg-portal-bg3 hover:text-portal-text",
              collapsed ? "justify-center px-2" : "px-3",
            ].join(" ")}
          >
            <LogOut size={16} strokeWidth={2} />
            {collapsed ? null : <span>Sign out</span>}
          </button>
        </div>
      </aside>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
    </>
  );
}
