"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Home,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
} from "lucide-react";
import {
  getPortalModules,
  HOME_ACCENT,
  HOME_HREF,
  isPathInModule,
  isPathInSettings,
  moduleDashboardHref,
  SETTINGS_ACCENT,
  type PortalModule,
} from "@/config/modules";
import { getSettingsNavItems } from "@/config/navigation";
import {
  NavCollapsibleSection,
  NavHomeLink,
} from "@/components/portal/NavCollapsibleSection";
import { mobileModuleActive, MobileModuleSheet, MobileSettingsSheet } from "@/components/portal/MobileModuleSheet";

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

function moduleToNavItems(module: PortalModule) {
  return module.items.map((item) => ({
    label: item.label,
    href: item.href,
    icon: item.icon,
    aliases: item.aliases,
  }));
}

export function Sidebar({
  showAdminLink = false,
  showStock = false,
}: {
  showAdminLink?: boolean;
  showStock?: boolean;
}) {
  const pathname = usePathname();
  const modules = useMemo(
    () => getPortalModules(showStock || showAdminLink),
    [showStock, showAdminLink],
  );
  const settingsItems = useMemo(() => getSettingsNavItems(showAdminLink), [showAdminLink]);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileSheetModule, setMobileSheetModule] = useState<PortalModule | null>(null);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setMobileSheetModule(null);
    setMobileSettingsOpen(false);
  }, [pathname]);

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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const width = collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED;
  const homeActive = pathname === HOME_HREF;
  const settingsActive = isPathInSettings(pathname);
  // The launcher already handles switching between top-level modules, so the
  // shell sidebar only surfaces the module you're currently inside — not all three.
  const activeModule = modules.find((m) => isPathInModule(pathname, m.id));

  const settingsNavItems = settingsItems.map((item) => ({
    label: item.label,
    href: item.href,
    icon: item.icon,
  }));

  return (
    <>
      <aside
        style={{ width }}
        className={[
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-white/90 py-5 backdrop-blur-sm transition-[width] duration-200 md:flex",
          collapsed ? "px-2" : "px-3",
        ].join(" ")}
      >
        <div className={collapsed ? "flex justify-center px-1 py-1" : "px-2 py-1"}>
          {collapsed ? <LogoMark /> : <LogoFull />}
        </div>

        <div className="mt-6 flex-1 space-y-2 overflow-y-auto">
          <NavHomeLink
            href={HOME_HREF}
            label="Home"
            icon={Home}
            accent={HOME_ACCENT}
            active={homeActive}
            collapsed={collapsed}
          />

          {activeModule ? (
            <NavCollapsibleSection
              key={activeModule.id}
              sectionId={activeModule.id}
              label={activeModule.label}
              icon={activeModule.icon}
              accent={activeModule.accent}
              homeHref={moduleDashboardHref(activeModule)}
              items={moduleToNavItems(activeModule)}
              collapsed={collapsed}
              isActive={(p) => isPathInModule(p, activeModule.id)}
              forceOpen
            />
          ) : (
            modules.map((module) => (
              <NavHomeLink
                key={module.id}
                href={moduleDashboardHref(module)}
                label={module.label}
                icon={module.icon}
                accent={module.accent}
                active={false}
                collapsed={collapsed}
              />
            ))
          )}

          <NavCollapsibleSection
            sectionId="settings"
            label={showAdminLink ? "Settings" : "Account"}
            icon={Settings2}
            accent={SETTINGS_ACCENT}
            items={settingsNavItems}
            collapsed={collapsed}
            isActive={(p) => isPathInSettings(p)}
          />
        </div>

        <div className="mt-auto space-y-1 border-t border-line pt-3">
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? "Expand (⌘B)" : "Collapse (⌘B)"}
            className={[
              "focus-ring flex w-full items-center gap-2 rounded-lg py-2 text-[13px] font-medium text-muted transition-colors hover:bg-canvas hover:text-ink",
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
              "focus-ring flex w-full items-center gap-2 rounded-lg py-2 text-[13px] font-medium text-muted transition-colors hover:bg-canvas hover:text-ink",
              collapsed ? "justify-center px-2" : "px-3",
            ].join(" ")}
          >
            <LogOut size={16} />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-white/90 backdrop-blur-sm md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <Link
          href={HOME_HREF}
          className={[
            "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium",
            homeActive ? HOME_ACCENT.mobileActive : HOME_ACCENT.labelText,
          ].join(" ")}
        >
          <Home size={20} strokeWidth={homeActive ? 2.2 : 1.8} />
          <span>Home</span>
        </Link>
        {modules.map((module) => {
          const Icon = module.icon;
          const active = mobileModuleActive(pathname, module.id);
          return (
            <button
              key={module.id}
              type="button"
              onClick={() => {
                setMobileSettingsOpen(false);
                setMobileSheetModule(module);
              }}
              className={[
                "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium",
                active ? module.accent.mobileActive : module.accent.labelText,
              ].join(" ")}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              <span>{module.label === "Stock balance" ? "Stock" : module.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setMobileSheetModule(null);
            setMobileSettingsOpen(true);
          }}
          className={[
            "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium",
            settingsActive ? SETTINGS_ACCENT.mobileActive : SETTINGS_ACCENT.labelText,
          ].join(" ")}
        >
          <Settings2 size={20} strokeWidth={settingsActive ? 2.2 : 1.8} />
          <span>{showAdminLink ? "Settings" : "Account"}</span>
        </button>
      </nav>

      <MobileModuleSheet
        open={mobileSheetModule !== null}
        module={mobileSheetModule}
        onClose={() => setMobileSheetModule(null)}
      />
      <MobileSettingsSheet
        open={mobileSettingsOpen}
        items={settingsNavItems}
        title={showAdminLink ? "Settings" : "Account"}
        onClose={() => setMobileSettingsOpen(false)}
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
