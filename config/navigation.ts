import type { LucideIcon } from "lucide-react";
import { Archive, History, ListChecks, PackageCheck, Settings2, User2 } from "lucide-react";

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

/** COD sub-section — list + archive */
export const codNav: NavItem[] = [
  { label: "COD List",    href: "/cod-list",   icon: ListChecks },
  { label: "COD Archive", href: "/cod-history", icon: Archive },
];

/** Other operational tools */
export const toolsNav: NavItem[] = [
  { label: "Fulfillment", href: "/fulfillment", icon: PackageCheck },
  { label: "History",     href: "/history",     icon: History },
];

export const settingsNav: NavItem[] = [
  { label: "COD Settings", href: "/cod-settings", icon: Settings2 },
  { label: "Account",      href: "/account",       icon: User2 },
];

/** Grouped sidebar nav (desktop) */
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
