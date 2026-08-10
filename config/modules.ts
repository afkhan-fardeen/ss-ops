import type { LucideIcon } from "lucide-react";
import {
  FileSearch,
  History,
  LayoutDashboard,
  Receipt,
  Settings2,
  Truck,
  Wallet,
  Warehouse,
} from "lucide-react";

export type ModuleId = "cod" | "fulfillment" | "stock" | "awb" | "subscriptions";

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

// Module accents derive from the cod/fulfillment/stock Tailwind tokens — see design-plan.md.
export const COD_ACCENT: ModuleAccent = {
  rail: "bg-cod",
  labelText: "text-cod",
  labelHover: "hover:bg-cod-bg",
  activeBg: "bg-cod-bg",
  activeText: "text-cod",
  pillBg: "bg-cod-bg",
  pillText: "text-cod",
  mobileActive: "text-cod",
  chartFill: "#2F9E7F",
  chartStroke: "#237A63",
};

export const FULFILLMENT_ACCENT: ModuleAccent = {
  rail: "bg-fulfillment",
  labelText: "text-fulfillment",
  labelHover: "hover:bg-fulfillment-bg",
  activeBg: "bg-fulfillment-bg",
  activeText: "text-fulfillment",
  pillBg: "bg-fulfillment-bg",
  pillText: "text-fulfillment",
  mobileActive: "text-fulfillment",
  chartFill: "#C4553A",
  chartStroke: "#9C4230",
};

export const STOCK_ACCENT: ModuleAccent = {
  rail: "bg-stock",
  labelText: "text-stock",
  labelHover: "hover:bg-stock-bg",
  activeBg: "bg-stock-bg",
  activeText: "text-stock",
  pillBg: "bg-stock-bg",
  pillText: "text-stock",
  mobileActive: "text-stock",
  chartFill: "#6B8A3E",
  chartStroke: "#546E31",
};

export const HOME_ACCENT: ModuleAccent = {
  rail: "bg-ink",
  labelText: "text-ink",
  labelHover: "hover:bg-canvas",
  activeBg: "bg-canvas",
  activeText: "text-ink",
  pillBg: "bg-canvas",
  pillText: "text-ink",
  mobileActive: "text-ink",
  chartFill: "#1E1D1A",
  chartStroke: "#1E1D1A",
};

export const SETTINGS_ACCENT: ModuleAccent = {
  rail: "bg-gold",
  labelText: "text-gold",
  labelHover: "hover:bg-[rgba(184,132,46,0.08)]",
  activeBg: "bg-[rgba(184,132,46,0.12)]",
  activeText: "text-gold",
  pillBg: "bg-[rgba(184,132,46,0.12)]",
  pillText: "text-gold",
  mobileActive: "text-gold",
  chartFill: "#B8842E",
  chartStroke: "#8F6623",
};

export const AWB_ACCENT: ModuleAccent = {
  rail: "bg-awb",
  labelText: "text-awb",
  labelHover: "hover:bg-awb-bg",
  activeBg: "bg-awb-bg",
  activeText: "text-awb",
  pillBg: "bg-awb-bg",
  pillText: "text-awb",
  mobileActive: "text-awb",
  chartFill: "#2E6BAF",
  chartStroke: "#235489",
};

export const SUBSCRIPTIONS_ACCENT: ModuleAccent = {
  rail: "bg-subscriptions",
  labelText: "text-subscriptions",
  labelHover: "hover:bg-subscriptions-bg",
  activeBg: "bg-subscriptions-bg",
  activeText: "text-subscriptions",
  pillBg: "bg-subscriptions-bg",
  pillText: "text-subscriptions",
  mobileActive: "text-subscriptions",
  chartFill: "#6B4FA2",
  chartStroke: "#543F82",
};

function codModule(): PortalModule {
  return {
    id: "cod",
    label: "COD",
    icon: Wallet,
    accent: COD_ACCENT,
    items: [
      { label: "Dashboard", href: "/cod/dashboard", icon: LayoutDashboard },
      { label: "COD List", href: "/cod/list", icon: Wallet, aliases: ["/cod-list"] },
      { label: "History", href: "/cod/history", icon: History, aliases: ["/cod-history"] },
      { label: "Settings", href: "/cod/settings", icon: Settings2, aliases: ["/cod-settings"] },
    ],
  };
}

function fulfillmentModule(): PortalModule {
  return {
    id: "fulfillment",
    label: "Fulfillment",
    icon: Truck,
    accent: FULFILLMENT_ACCENT,
    items: [
      { label: "Dashboard", href: "/fulfillment/dashboard", icon: LayoutDashboard },
      {
        label: "Fulfillment list",
        href: "/fulfillment/list",
        icon: Truck,
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
    icon: Warehouse,
    adminOnly: true,
    accent: STOCK_ACCENT,
    items: [
      { label: "Dashboard", href: "/stock-balance/dashboard", icon: LayoutDashboard },
      {
        label: "Balance",
        href: "/stock-balance/balance",
        icon: Warehouse,
        aliases: ["/stock-balance"],
      },
      { label: "History", href: "/stock-balance/history", icon: History },
      { label: "Settings", href: "/stock-balance/settings", icon: Settings2 },
    ],
  };
}

function awbModule(): PortalModule {
  return {
    id: "awb",
    label: "AWB Lookup",
    icon: FileSearch,
    accent: AWB_ACCENT,
    items: [{ label: "Lookup", href: "/awb", icon: FileSearch }],
  };
}

function subscriptionsModule(): PortalModule {
  return {
    id: "subscriptions",
    label: "Subscriptions",
    icon: Receipt,
    adminOnly: true,
    accent: SUBSCRIPTIONS_ACCENT,
    items: [
      { label: "Requests", href: "/subscriptions", icon: Receipt },
      { label: "Active", href: "/subscriptions/active", icon: History },
    ],
  };
}

export function getPortalModules(showAdmin: boolean): PortalModule[] {
  const modules = [codModule(), fulfillmentModule(), awbModule()];
  if (showAdmin) {
    modules.push(stockModule());
    modules.push(subscriptionsModule());
  }
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
    case "awb":
      return ["/awb"];
    case "subscriptions":
      return ["/subscriptions"];
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
  { path: "/dashboard/analytics", title: "Analytics" },
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
  {
    path: "/awb",
    title: "AWB Lookup",
    moduleId: "awb",
    moduleLabel: "AWB Lookup",
    accent: AWB_ACCENT,
  },
  {
    path: "/subscriptions",
    title: "Subscription requests",
    moduleId: "subscriptions",
    moduleLabel: "Subscriptions",
    accent: SUBSCRIPTIONS_ACCENT,
  },
  {
    path: "/subscriptions/active",
    title: "Active subscriptions",
    moduleId: "subscriptions",
    moduleLabel: "Subscriptions",
    accent: SUBSCRIPTIONS_ACCENT,
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
