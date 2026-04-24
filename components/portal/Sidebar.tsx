"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { settingsNav, toolsNav, type NavItem } from "@/config/navigation";

const STORAGE_KEY = "portal.sidebar.collapsed";
const WIDTH_EXPANDED = 240;
const WIDTH_COLLAPSED = 64;

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
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={[
        "group relative flex items-center gap-3 rounded-lg py-2 text-[13px] font-medium transition-colors",
        collapsed ? "justify-center px-2" : "px-3",
        active
          ? "bg-[#F7F7F7] text-[#111111]"
          : "text-[#999999] hover:bg-[#F7F7F7] hover:text-[#111111]",
      ].join(" ")}
    >
      {active && (
        <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-[#111111]" aria-hidden />
      )}
      <Icon
        size={16}
        strokeWidth={2}
        className={active ? "text-[#111111]" : "text-[#999999] group-hover:text-[#111111]"}
      />
      {!collapsed && (
        <>
          <span className="flex-1">{item.label}</span>
          {item.soon && (
            <span className="rounded bg-[#F7F7F7] px-1.5 py-0.5 text-[10px] font-medium text-[#999999]">
              Soon
            </span>
          )}
        </>
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    applySidebarWidth(collapsed);
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "b" || e.key === "B")) {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable)
        )
          return;
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
  const allNav = [...toolsNav, ...settingsNav];

  return (
    <>
      {/* ── Desktop sidebar (md+) ─────────────────────────────── */}
      <aside
        style={{ width }}
        className={[
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-[#EBEBEB] bg-white py-5 transition-[width] duration-200 md:flex",
          collapsed ? "px-2" : "px-3",
        ].join(" ")}
      >
        {/* Logo */}
        <div className={collapsed ? "flex justify-center px-1 py-1" : "px-2 py-1"}>
          {collapsed ? (
            <LogoMark size={28} />
          ) : (
            <LogoFull />
          )}
        </div>

        {/* Nav */}
        <div className="mt-6 flex-1 space-y-5 overflow-y-auto">
          <div>
            {!collapsed && (
              <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[#999999]">
                Tools
              </div>
            )}
            <nav className="mt-2 flex flex-col gap-0.5">
              {toolsNav.map((item) => (
                <NavLink key={item.href} item={item} active={pathname === item.href} collapsed={collapsed} />
              ))}
            </nav>
          </div>

          <div>
            {!collapsed && (
              <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[#999999]">
                Settings
              </div>
            )}
            <nav className="mt-2 flex flex-col gap-0.5">
              {settingsNav.map((item) => (
                <NavLink key={item.href} item={item} active={pathname === item.href} collapsed={collapsed} />
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="mt-auto space-y-1 border-t border-[#EBEBEB] pt-3">
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? "Expand (⌘B)" : "Collapse (⌘B)"}
            className={[
              "focus-ring flex w-full items-center gap-2 rounded-lg py-2 text-[13px] font-medium text-[#999999] transition-colors hover:bg-[#F7F7F7] hover:text-[#111111]",
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
              "focus-ring flex w-full items-center gap-2 rounded-lg py-2 text-[13px] font-medium text-[#999999] transition-colors hover:bg-[#F7F7F7] hover:text-[#111111]",
              collapsed ? "justify-center px-2" : "px-3",
            ].join(" ")}
          >
            <LogOut size={16} strokeWidth={2} />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar (< md) ─────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex border-t border-[#EBEBEB] bg-white md:hidden">
        {allNav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors",
                active ? "text-[#111111]" : "text-[#999999]",
              ].join(" ")}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

/** Small square logo mark for collapsed sidebar */
function LogoMark({ size = 28 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.svg" alt="Seissense Ops" width={size} height={size} className="object-contain" />
  );
}

/** Full logo for expanded sidebar */
function LogoFull() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.svg" alt="Seissense Ops" height={28} className="h-7 w-auto object-contain" />
  );
}
