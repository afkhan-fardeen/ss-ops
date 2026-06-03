"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  Home,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  getModuleOpenKey,
  getPortalModules,
  HOME_HREF,
  isNavItemActive,
  isPathInModule,
  type ModuleNavItem,
  type PortalModule,
} from "@/config/modules";
import { getSettingsNavItems } from "@/config/navigation";
import { mobileModuleActive, MobileModuleSheet } from "@/components/portal/MobileModuleSheet";

const STORAGE_KEY = "portal.sidebar.collapsed";
const WIDTH_EXPANDED = 248;
const WIDTH_COLLAPSED = 64;

function applySidebarWidth(collapsed: boolean) {
  if (typeof document === "undefined") return;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  if (isMobile) {
    document.documentElement.style.setProperty("--sb-w", "0px");
    return;
  }
  document.documentElement.style.setProperty(
    "--sb-w",
    `${collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED}px`,
  );
}

function readModuleOpen(id: string, pathname: string, moduleId: string): boolean {
  if (isPathInModule(pathname, moduleId as "cod" | "fulfillment" | "stock")) return true;
  try {
    return window.localStorage.getItem(getModuleOpenKey(id as "cod" | "fulfillment" | "stock")) !== "0";
  } catch {
    return true;
  }
}

function ModuleNavLink({
  item,
  module,
  active,
  collapsed,
}: {
  item: ModuleNavItem;
  module: PortalModule;
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
        collapsed ? "justify-center px-2" : "pl-4 pr-3",
        active
          ? `${module.accent.activeBg} ${module.accent.activeText}`
          : "text-[#999999] hover:bg-[#F7F7F7] hover:text-[#111111]",
      ].join(" ")}
    >
      {active && (
        <span
          className={`absolute inset-y-1.5 left-0 w-[3px] rounded-r ${module.accent.rail}`}
          aria-hidden
        />
      )}
      <Icon size={16} strokeWidth={2} />
      {!collapsed && <span className="flex-1">{item.label}</span>}
    </Link>
  );
}

function ModuleSection({
  module,
  collapsed,
  pathname,
  open,
  onToggle,
}: {
  module: PortalModule;
  collapsed: boolean;
  pathname: string;
  open: boolean;
  onToggle: () => void;
}) {
  const ModuleIcon = module.icon;
  const moduleActive = isPathInModule(pathname, module.id);

  if (collapsed) {
    const first = module.items[0]!;
    return (
      <Link
        href={first.href}
        title={module.label}
        className={[
          "flex justify-center rounded-lg p-2 transition-colors",
          moduleActive ? module.accent.activeBg : "hover:bg-[#F7F7F7]",
        ].join(" ")}
      >
        <ModuleIcon
          size={18}
          className={moduleActive ? module.accent.activeText : "text-[#999999]"}
        />
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={[
          "focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider transition-colors",
          moduleActive ? module.accent.activeText : "text-[#999999] hover:bg-[#F7F7F7]",
        ].join(" ")}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${module.accent.rail}`} aria-hidden />
        <span className="flex-1">{module.label}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <nav className="mt-0.5 flex flex-col gap-0.5">
          {module.items.map((item) => (
            <ModuleNavLink
              key={item.href}
              item={item}
              module={module}
              active={isNavItemActive(pathname, item)}
              collapsed={false}
            />
          ))}
        </nav>
      ) : null}
    </div>
  );
}

export function Sidebar({ showAdminLink = false }: { showAdminLink?: boolean }) {
  const pathname = usePathname();
  const modules = getPortalModules(showAdminLink);
  const settingsItems = getSettingsNavItems(showAdminLink);

  const [collapsed, setCollapsed] = useState(false);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [mobileSheetModule, setMobileSheetModule] = useState<PortalModule | null>(null);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const m of modules) {
      next[m.id] = readModuleOpen(m.id, pathname, m.id);
    }
    setOpenModules(next);
  }, [pathname, modules]);

  useEffect(() => {
    applySidebarWidth(collapsed);
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch { /* ignore */ }
  }, [collapsed]);

  useEffect(() => {
    const onResize = () => applySidebarWidth(collapsed);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [collapsed]);

  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);

  const toggleModule = useCallback((id: string) => {
    setOpenModules((prev) => {
      const next = !prev[id];
      try {
        window.localStorage.setItem(getModuleOpenKey(id as "cod" | "fulfillment" | "stock"), next ? "1" : "0");
      } catch { /* ignore */ }
      return { ...prev, [id]: next };
    });
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const width = collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED;
  const homeActive = pathname === HOME_HREF;

  return (
    <>
      <aside
        style={{ width }}
        className={[
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-[#EBEBEB] bg-white/90 py-5 backdrop-blur-sm transition-[width] duration-200 md:flex",
          collapsed ? "px-2" : "px-3",
        ].join(" ")}
      >
        <div className={collapsed ? "flex justify-center px-1 py-1" : "px-2 py-1"}>
          {collapsed ? <LogoMark /> : <LogoFull />}
        </div>

        <div className="mt-6 flex-1 space-y-4 overflow-y-auto">
          <Link
            href={HOME_HREF}
            title={collapsed ? "Home" : undefined}
            className={[
              "flex items-center gap-3 rounded-lg py-2 text-[13px] font-medium transition-colors",
              collapsed ? "justify-center px-2" : "px-3",
              homeActive
                ? "bg-[#F7F7F7] text-[#111111]"
                : "text-[#999999] hover:bg-[#F7F7F7] hover:text-[#111111]",
            ].join(" ")}
          >
            <Home size={16} />
            {!collapsed && <span>Home</span>}
          </Link>

          {modules.map((module) => (
            <ModuleSection
              key={module.id}
              module={module}
              collapsed={collapsed}
              pathname={pathname}
              open={openModules[module.id] ?? true}
              onToggle={() => toggleModule(module.id)}
            />
          ))}

          {!collapsed ? (
            <div className="pt-2">
              <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[#999999]">
                Settings
              </div>
              <nav className="mt-2 flex flex-col gap-0.5">
                {settingsItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                        active
                          ? "bg-[#F7F7F7] text-[#111111]"
                          : "text-[#999999] hover:bg-[#F7F7F7] hover:text-[#111111]",
                      ].join(" ")}
                    >
                      <Icon size={16} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ) : null}
        </div>

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
            {collapsed ? <PanelLeftOpen size={16} /> : <><PanelLeftClose size={16} /><span>Collapse</span></>}
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
            <LogOut size={16} />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[#EBEBEB] bg-white/90 backdrop-blur-sm md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <Link
          href={HOME_HREF}
          className={[
            "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium",
            pathname === HOME_HREF ? "text-[#111111]" : "text-[#999999]",
          ].join(" ")}
        >
          <Home size={20} />
          <span>Home</span>
        </Link>
        {modules.map((module) => {
          const Icon = module.icon;
          const active = mobileModuleActive(pathname, module.id);
          return (
            <button
              key={module.id}
              type="button"
              onClick={() => setMobileSheetModule(module)}
              className={[
                "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium",
                active ? module.accent.mobileActive : "text-[#999999]",
              ].join(" ")}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              <span>{module.label === "Stock balance" ? "Stock" : module.label}</span>
            </button>
          );
        })}
      </nav>

      <MobileModuleSheet
        open={mobileSheetModule !== null}
        module={mobileSheetModule}
        showAdmin={showAdminLink}
        onClose={() => setMobileSheetModule(null)}
      />
    </>
  );
}

function LogoMark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/favicon.png" alt="Seissense Ops" width={30} height={30} className="rounded-md object-contain" />
  );
}

function LogoFull() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.svg" alt="Seissense Ops" height={28} className="h-7 w-auto object-contain" />
  );
}
