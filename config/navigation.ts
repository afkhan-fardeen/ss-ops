import type { LucideIcon } from "lucide-react";
import { History, ListChecks, PackageCheck, Settings2, User2 } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Shown as a subtle badge; route may still exist as a placeholder. */
  soon?: boolean;
};

export const toolsNav: NavItem[] = [
  { label: "COD", href: "/cod-list", icon: ListChecks },
  { label: "Fulfillment", href: "/fulfillment", icon: PackageCheck },
  { label: "History", href: "/history", icon: History },
];

export const settingsNav: NavItem[] = [
  { label: "COD Settings", href: "/cod-settings", icon: Settings2 },
  { label: "Account", href: "/account", icon: User2 },
];
