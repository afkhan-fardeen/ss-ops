import type { LucideIcon } from "lucide-react";
import { History, ListChecks, PackageCheck, Scale, Settings2, Shield, User2 } from "lucide-react";

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

/** COD sub-section */
export const codNav: NavItem[] = [{ label: "COD List", href: "/cod-list", icon: ListChecks }];

/** Other operational tools */
export const toolsNav: NavItem[] = [
  { label: "Fulfillment", href: "/fulfillment", icon: PackageCheck },
  { label: "History",     href: "/history",     icon: History },
];

export const settingsNav: NavItem[] = [
  { label: "COD Settings", href: "/cod-settings", icon: Settings2 },
  { label: "Account",      href: "/account",       icon: User2 },
];

const adminSettingsItem: NavItem = { label: "Admin", href: "/admin", icon: Shield };
const stockBalanceItem: NavItem = { label: "Stock balance", href: "/stock-balance", icon: Scale };

/**
 * Desktop sidebar — includes Admin in Settings (first) when the user is a portal admin.
 * Stock balance (read-only preview) appears under Tools for admins only.
 */
export function getPortalNavGroups(showAdmin: boolean): NavGroup[] {
  const settingsItems = showAdmin ? [adminSettingsItem, ...settingsNav] : settingsNav;
  const toolsItems = showAdmin ? [...toolsNav, stockBalanceItem] : toolsNav;
  return [
    { label: "COD", items: codNav },
    { label: "Tools", items: toolsItems },
    { label: "Settings", items: settingsItems },
  ];
}

/** Grouped sidebar nav (desktop) — use getPortalNavGroups for admin-aware list */
export const navGroups: NavGroup[] = [
  { label: "COD",      items: codNav },
  { label: "Tools",    items: toolsNav },
  { label: "Settings", items: settingsNav },
];

/** Mobile bottom bar — 4 primary shortcuts */
export const mobileBottomItems: NavItem[] = [
  codNav[0],       // COD List
  toolsNav[0],     // Fulfillment
  toolsNav[1],     // History
  settingsNav[1],  // Account
];
