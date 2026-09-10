import type { LucideIcon } from "lucide-react";
import { Shield, User2 } from "lucide-react";

/** @deprecated Use ModuleNavItem from config/modules */
export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  soon?: boolean;
};

const settingsNav: NavItem[] = [{ label: "Account", href: "/account", icon: User2 }];

const adminSettingsItem: NavItem = { label: "Admin", href: "/admin", icon: Shield };

export function getSettingsNavItems(showAdmin: boolean): NavItem[] {
  return showAdmin ? [adminSettingsItem, ...settingsNav] : settingsNav;
}
