"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Home, LogOut, PanelLeftClose, PanelLeftOpen, Settings2 } from "lucide-react";
import {
  getPortalModules,
  groupModulesByDomain,
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
import { MobileNav } from "@/components/portal/MobileNav";
import { readPersistedBoolean, writePersistedBoolean } from "@/lib/browser/persisted-boolean";

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
  allowedModuleIds,
}: {
  showAdminLink?: boolean;
  /** Module ids the signed-in user may see (from allowed_modules / admin). */
  allowedModuleIds: string[];
}) {
  const pathname = usePathname();
  const modules = useMemo(
    () => getPortalModules(true).filter((m) => allowedModuleIds.includes(m.id)),
    [allowedModuleIds],
  );
  const settingsItems = useMemo(() => getSettingsNavItems(showAdminLink), [showAdminLink]);

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(readPersistedBoolean(STORAGE_KEY, false));
  }, []);

  useEffect(() => {
    applySidebarWidth(collapsed);
    writePersistedBoolean(STORAGE_KEY, collapsed);
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
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-white py-4 transition-[width] duration-200 md:flex",
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

          {groupModulesByDomain(modules).map((group) => (
            <div key={group.domain} className="space-y-1 pt-3">
              {collapsed ? (
                <div className="mx-3 border-t border-line" aria-hidden />
              ) : (
                <p className="px-3 pb-0.5 text-fs11 font-semibold uppercase tracking-wide max-md:normal-case max-md:tracking-normal text-muted">
                  {group.label}
                </p>
              )}
              {group.modules.map((module) => (
                <NavCollapsibleSection
                  key={module.id}
                  sectionId={module.id}
                  label={module.label}
                  icon={module.icon}
                  accent={module.accent}
                  homeHref={moduleDashboardHref(module)}
                  items={moduleToNavItems(module)}
                  collapsed={collapsed}
                  isActive={(p) => isPathInModule(p, module.id)}
                  defaultOpen={false}
                />
              ))}
            </div>
          ))}

          <div className="pt-3">
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
        </div>

        <div className="mt-auto space-y-1 border-t border-line pt-3">
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? "Expand (⌘B)" : "Collapse (⌘B)"}
            className={[
              "focus-ring flex w-full items-center gap-2 rounded-lg py-2 text-fs13 font-medium text-muted transition-colors hover:bg-canvas hover:text-ink",
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
              "focus-ring flex w-full items-center gap-2 rounded-lg py-2 text-fs13 font-medium text-muted transition-colors hover:bg-canvas hover:text-ink",
              collapsed ? "justify-center px-2" : "px-3",
            ].join(" ")}
          >
            <LogOut size={16} />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      <MobileNav modules={modules} showAdminLink={showAdminLink} />
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
