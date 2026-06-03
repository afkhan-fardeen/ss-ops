import type { LucideIcon } from "lucide-react";
import { Settings2, Shield, User2 } from "lucide-react";
import { getPortalModules, HOME_HREF, type ModuleId } from "@/config/modules";

/** @deprecated Use ModuleNavItem from config/modules */
export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  soon?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const settingsNav: NavItem[] = [
  { label: "Account", href: "/account", icon: User2 },
];

const adminSettingsItem: NavItem = { label: "Admin", href: "/admin", icon: Shield };

export function getSettingsNavItems(showAdmin: boolean): NavItem[] {
  return showAdmin ? [adminSettingsItem, ...settingsNav] : settingsNav;
}

/** Legacy — flat groups for any code still importing */
export function getPortalNavGroups(showAdmin: boolean): NavGroup[] {
  const modules = getPortalModules(showAdmin);
  return [
    ...modules.map((m) => ({
      label: m.label,
      items: m.items.map((i) => ({ label: i.label, href: i.href, icon: i.icon })),
    })),
    { label: "Settings", items: getSettingsNavItems(showAdmin) },
  ];
}

export { HOME_HREF, getPortalModules, type ModuleId };
