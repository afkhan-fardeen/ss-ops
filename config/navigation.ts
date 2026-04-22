import type { LucideIcon } from "lucide-react";
import { BarChart3, ListChecks, PackageCheck, User2 } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Shown as a subtle badge; route may still exist as a placeholder. */
  soon?: boolean;
};

export const toolsNav: NavItem[] = [
  { label: "COD List", href: "/cod-list", icon: ListChecks },
  { label: "Fulfillment", href: "/fulfillment", icon: PackageCheck },
  { label: "Reports", href: "/reports", icon: BarChart3, soon: true },
];

export const settingsNav: NavItem[] = [
  { label: "Account", href: "/account", icon: User2, soon: true },
];
