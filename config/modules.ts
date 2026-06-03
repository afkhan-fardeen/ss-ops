import type { LucideIcon } from "lucide-react";
import {
  History,
  LayoutDashboard,
  ListChecks,
  PackageCheck,
  Scale,
  Settings2,
} from "lucide-react";

export type ModuleId = "cod" | "fulfillment" | "stock";

export type ModuleNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Additional paths that should highlight this nav item */
  aliases?: string[];
};

export type ModuleAccent = {
  rail: string;
  labelText: string;
  labelHover: string;
  activeBg: string;
  activeText: string;
  pillBg: string;
  pillText: string;
  mobileActive: string;
  /** Recharts bar / line fill */
  chartFill: string;
  chartStroke: string;
};

export type NavSectionId = ModuleId | "settings" | "home";

export type PortalModule = {
  id: ModuleId;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  accent: ModuleAccent;
  items: ModuleNavItem[];
};

export const HOME_HREF = "/dashboard";

export const COD_ACCENT: ModuleAccent = {
  rail: "bg-blue-500",
  labelText: "text-blue-700",
  labelHover: "hover:bg-blue-50/60",
  activeBg: "bg-blue-50/80",
  activeText: "text-blue-900",
  pillBg: "bg-blue-50",
  pillText: "text-blue-800",
  mobileActive: "text-blue-700",
  chartFill: "#3B82F6",
  chartStroke: "#2563EB",
};

export const FULFILLMENT_ACCENT: ModuleAccent = {
  rail: "bg-[#E57373]",
  labelText: "text-[#C25151]",
  labelHover: "hover:bg-[rgba(229,115,115,0.08)]",
  activeBg: "bg-[rgba(229,115,115,0.12)]",
  activeText: "text-[#9B2C2C]",
  pillBg: "bg-[rgba(229,115,115,0.12)]",
  pillText: "text-[#9B2C2C]",
  mobileActive: "text-[#C25151]",
  chartFill: "#E57373",
  chartStroke: "#C25151",
};

export const STOCK_ACCENT: ModuleAccent = {
  rail: "bg-emerald-500",
  labelText: "text-emerald-700",
  labelHover: "hover:bg-emerald-50/60",
  activeBg: "bg-emerald-50/80",
  activeText: "text-emerald-900",
  pillBg: "bg-emerald-50",
  pillText: "text-emerald-800",
  mobileActive: "text-emerald-700",
  chartFill: "#10B981",
  chartStroke: "#059669",
};

export const HOME_ACCENT: ModuleAccent = {
  rail: "bg-slate-500",
  labelText: "text-slate-600",
  labelHover: "hover:bg-slate-50",
  activeBg: "bg-slate-50",
  activeText: "text-slate-900",
  pillBg: "bg-slate-100",
  pillText: "text-slate-800",
  mobileActive: "text-slate-800",
  chartFill: "#64748B",
  chartStroke: "#475569",
};

export const SETTINGS_ACCENT: ModuleAccent = {
  rail: "bg-[#999999]",
  labelText: "text-[#555555]",
  labelHover: "hover:bg-[#F7F7F7]",
  activeBg: "bg-[#F7F7F7]",
  activeText: "text-[#111111]",
  pillBg: "bg-[#F7F7F7]",
  pillText: "text-[#333333]",
  mobileActive: "text-[#111111]",
  chartFill: "#999999",
  chartStroke: "#666666",
};

function codModule(): PortalModule {
  return {
    id: "cod",
    label: "COD",
    icon: ListChecks,
    accent: COD_ACCENT,
    items: [
      { label: "Dashboard", href: "/cod/dashboard", icon: LayoutDashboard },
      { label: "COD List", href: "/cod/list", icon: ListChecks, aliases: ["/cod-list"] },
      { label: "History", href: "/cod/history", icon: History, aliases: ["/cod-history"] },
      { label: "Settings", href: "/cod/settings", icon: Settings2, aliases: ["/cod-settings"] },
    ],
  };
}

function fulfillmentModule(): PortalModule {
  return {
    id: "fulfillment",
    label: "Fulfillment",
    icon: PackageCheck,
    accent: FULFILLMENT_ACCENT,
    items: [
      { label: "Dashboard", href: "/fulfillment/dashboard", icon: LayoutDashboard },
      {
        label: "Fulfillment list",
        href: "/fulfillment/list",
        icon: PackageCheck,
        aliases: ["/fulfillment"],
      },
      { label: "History", href: "/fulfillment/history", icon: History, aliases: ["/history"] },
      { label: "Settings", href: "/fulfillment/settings", icon: Settings2 },
    ],
  };
}

function stockModule(): PortalModule {
  return {
    id: "stock",
    label: "Stock balance",
    icon: Scale,
    adminOnly: true,
    accent: STOCK_ACCENT,
    items: [
      { label: "Dashboard", href: "/stock-balance/dashboard", icon: LayoutDashboard },
      {
        label: "Balance",
        href: "/stock-balance/balance",
        icon: Scale,
        aliases: ["/stock-balance"],
      },
      { label: "History", href: "/stock-balance/history", icon: History },
      { label: "Settings", href: "/stock-balance/settings", icon: Settings2 },
    ],
  };
}

export function getPortalModules(showAdmin: boolean): PortalModule[] {
  const modules = [codModule(), fulfillmentModule()];
  if (showAdmin) modules.push(stockModule());
  return modules;
}

/** Path prefixes that belong to a module (includes legacy aliases). */
export function modulePathPrefixes(id: ModuleId): string[] {
  switch (id) {
    case "cod":
      return ["/cod", "/cod-list", "/cod-settings", "/cod-history"];
    case "fulfillment":
      return ["/fulfillment", "/history"];
    case "stock":
      return ["/stock-balance"];
    default:
      return [];
  }
}

export function isPathInModule(pathname: string, id: ModuleId): boolean {
  return modulePathPrefixes(id).some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export type RouteMeta = {
  title: string;
  moduleId?: ModuleId;
  moduleLabel?: string;
  accent?: ModuleAccent;
};

type RouteEntry = RouteMeta & { path: string };

const GLOBAL_ROUTES: RouteEntry[] = [
  { path: "/dashboard", title: "Home" },
  { path: "/account", title: "Account" },
  { path: "/admin", title: "Admin" },
];

const MODULE_ROUTE_ENTRIES: RouteEntry[] = [
  { path: "/cod/dashboard", title: "Dashboard", moduleId: "cod", moduleLabel: "COD", accent: COD_ACCENT },
  { path: "/cod/list", title: "COD List", moduleId: "cod", moduleLabel: "COD", accent: COD_ACCENT },
  { path: "/cod-list", title: "COD List", moduleId: "cod", moduleLabel: "COD", accent: COD_ACCENT },
  { path: "/cod/history", title: "History", moduleId: "cod", moduleLabel: "COD", accent: COD_ACCENT },
  { path: "/cod/settings", title: "Settings", moduleId: "cod", moduleLabel: "COD", accent: COD_ACCENT },
  { path: "/cod-settings", title: "Settings", moduleId: "cod", moduleLabel: "COD", accent: COD_ACCENT },
  { path: "/cod/history", title: "History", moduleId: "cod", moduleLabel: "COD", accent: COD_ACCENT },
  { path: "/cod-history", title: "History", moduleId: "cod", moduleLabel: "COD", accent: COD_ACCENT },
  {
    path: "/fulfillment/dashboard",
    title: "Dashboard",
    moduleId: "fulfillment",
    moduleLabel: "Fulfillment",
    accent: FULFILLMENT_ACCENT,
  },
  {
    path: "/fulfillment/list",
    title: "Fulfillment list",
    moduleId: "fulfillment",
    moduleLabel: "Fulfillment",
    accent: FULFILLMENT_ACCENT,
  },
  {
    path: "/fulfillment",
    title: "Fulfillment list",
    moduleId: "fulfillment",
    moduleLabel: "Fulfillment",
    accent: FULFILLMENT_ACCENT,
  },
  {
    path: "/fulfillment/history",
    title: "History",
    moduleId: "fulfillment",
    moduleLabel: "Fulfillment",
    accent: FULFILLMENT_ACCENT,
  },
  { path: "/history", title: "History", moduleId: "fulfillment", moduleLabel: "Fulfillment", accent: FULFILLMENT_ACCENT },
  {
    path: "/fulfillment/settings",
    title: "Settings",
    moduleId: "fulfillment",
    moduleLabel: "Fulfillment",
    accent: FULFILLMENT_ACCENT,
  },
  {
    path: "/stock-balance/dashboard",
    title: "Dashboard",
    moduleId: "stock",
    moduleLabel: "Stock balance",
    accent: STOCK_ACCENT,
  },
  {
    path: "/stock-balance/balance",
    title: "Balance",
    moduleId: "stock",
    moduleLabel: "Stock balance",
    accent: STOCK_ACCENT,
  },
  {
    path: "/stock-balance",
    title: "Balance",
    moduleId: "stock",
    moduleLabel: "Stock balance",
    accent: STOCK_ACCENT,
  },
  {
    path: "/stock-balance/history",
    title: "History",
    moduleId: "stock",
    moduleLabel: "Stock balance",
    accent: STOCK_ACCENT,
  },
  {
    path: "/stock-balance/settings",
    title: "Settings",
    moduleId: "stock",
    moduleLabel: "Stock balance",
    accent: STOCK_ACCENT,
  },
];

const ALL_ROUTES = [...GLOBAL_ROUTES, ...MODULE_ROUTE_ENTRIES].sort(
  (a, b) => b.path.length - a.path.length,
);

export function resolveRouteMeta(pathname: string): RouteMeta {
  const exact = ALL_ROUTES.find((r) => r.path === pathname);
  if (exact) {
    const { path: _p, title, moduleId, moduleLabel, accent } = exact;
    return { title, moduleId, moduleLabel, accent };
  }
  for (const r of ALL_ROUTES) {
    if (pathname.startsWith(`${r.path}/`)) {
      const { path: _p, title, moduleId, moduleLabel, accent } = r;
      return { title, moduleId, moduleLabel, accent };
    }
  }
  return { title: "Portal" };
}

export function isNavItemActive(pathname: string, item: ModuleNavItem): boolean {
  if (pathname === item.href) return true;
  if (item.aliases?.includes(pathname)) return true;
  if (pathname.startsWith(`${item.href}/`)) return true;
  for (const alias of item.aliases ?? []) {
    if (pathname.startsWith(`${alias}/`)) return true;
  }
  return false;
}

export function isCodListPath(pathname: string): boolean {
  return pathname === "/cod-list" || pathname === "/cod/list" || pathname.startsWith("/cod/list?");
}

const OPEN_STORAGE_PREFIX = "portal.nav.open.";

export function getNavOpenKey(id: NavSectionId): string {
  return `${OPEN_STORAGE_PREFIX}${id}`;
}

/** @deprecated Use getNavOpenKey */
export function getModuleOpenKey(id: ModuleId): string {
  return getNavOpenKey(id);
}

export function moduleDashboardHref(module: PortalModule): string {
  return module.items.find((i) => i.label === "Dashboard")?.href ?? module.items[0]!.href;
}

const SETTINGS_PATHS = ["/account", "/admin"];

export function isPathInSettings(pathname: string): boolean {
  return SETTINGS_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
