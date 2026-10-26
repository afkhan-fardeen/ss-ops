import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  FileSearch,
  History,
  LayoutDashboard,
  Package,
  Receipt,
  Settings2,
  Truck,
  Warehouse,
} from "lucide-react";

export type ModuleId =
  | "fulfillment"
  | "stock"
  | "awb"
  | "subscriptions"
  | "salesReport";

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

export type ModuleDomain = "orders" | "inventory" | "finance";

export const DOMAIN_ORDER: ModuleDomain[] = ["orders", "inventory", "finance"];
export const DOMAIN_LABEL: Record<ModuleDomain, string> = {
  orders: "Orders & Delivery",
  inventory: "Inventory",
  finance: "Finance",
};

export type PortalModule = {
  id: ModuleId;
  label: string;
  /** Short label for tight spaces (mobile tab bar). */
  shortLabel?: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  /** Sidebar grouping. */
  domain: ModuleDomain;
  /** Where a single tap on the module should land (the page people actually use). */
  primaryHref: string;
  accent: ModuleAccent;
  items: ModuleNavItem[];
};

export const HOME_HREF = "/dashboard";

// One accent per area (orders = blue, inventory = teal, finance = orange, system = cyan); home uses the primary blue.
// Class names are written out in full so Tailwind's scanner keeps them.
const ORDERS_ACCENT: ModuleAccent = {
  rail: "bg-orders-solid",
  labelText: "text-orders",
  labelHover: "hover:bg-orders-soft",
  activeBg: "bg-orders-soft",
  activeText: "text-orders",
  pillBg: "bg-orders-soft",
  pillText: "text-orders",
  mobileActive: "text-orders",
  chartFill: "#2563EB",
  chartStroke: "#1D4ED8",
};
const INVENTORY_ACCENT: ModuleAccent = {
  rail: "bg-inventory-solid",
  labelText: "text-inventory",
  labelHover: "hover:bg-inventory-soft",
  activeBg: "bg-inventory-soft",
  activeText: "text-inventory",
  pillBg: "bg-inventory-soft",
  pillText: "text-inventory",
  mobileActive: "text-inventory",
  chartFill: "#0D9488",
  chartStroke: "#0F766E",
};
const FINANCE_ACCENT: ModuleAccent = {
  rail: "bg-finance-solid",
  labelText: "text-finance",
  labelHover: "hover:bg-finance-soft",
  activeBg: "bg-finance-soft",
  activeText: "text-finance",
  pillBg: "bg-finance-soft",
  pillText: "text-finance",
  mobileActive: "text-finance",
  chartFill: "#EA580C",
  chartStroke: "#C2410C",
};
const SYSTEM_ACCENT: ModuleAccent = {
  rail: "bg-system-solid",
  labelText: "text-system",
  labelHover: "hover:bg-system-soft",
  activeBg: "bg-system-soft",
  activeText: "text-system",
  pillBg: "bg-system-soft",
  pillText: "text-system",
  mobileActive: "text-system",
  chartFill: "#0891B2",
  chartStroke: "#0E7490",
};
const HOME_PRIMARY: ModuleAccent = {
  rail: "bg-primary",
  labelText: "text-primary",
  labelHover: "hover:bg-primary-soft",
  activeBg: "bg-primary-soft",
  activeText: "text-primary-strong",
  pillBg: "bg-primary-soft",
  pillText: "text-primary-strong",
  mobileActive: "text-primary-strong",
  chartFill: "#2563EB",
  chartStroke: "#1D4ED8",
};

export const FULFILLMENT_ACCENT: ModuleAccent = ORDERS_ACCENT;
export const STOCK_ACCENT: ModuleAccent = INVENTORY_ACCENT;
export const SUBSCRIPTIONS_ACCENT: ModuleAccent = FINANCE_ACCENT;
export const HOME_ACCENT: ModuleAccent = HOME_PRIMARY;
export const SETTINGS_ACCENT: ModuleAccent = SYSTEM_ACCENT;
const AWB_ACCENT: ModuleAccent = ORDERS_ACCENT;

/** Accent for an area, by domain. */
export function accentForDomain(domain: ModuleDomain): ModuleAccent {
  return domain === "orders" ? ORDERS_ACCENT : domain === "inventory" ? INVENTORY_ACCENT : FINANCE_ACCENT;
}

function fulfillmentModule(): PortalModule {
  return {
    id: "fulfillment",
    domain: "orders",
    primaryHref: "/fulfillment/list",
    shortLabel: "Orders",
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
    label: "Stock",
    icon: Warehouse,
    adminOnly: true,
    domain: "inventory",
    primaryHref: "/stock-balance/balance",
    shortLabel: "Stock",
    accent: STOCK_ACCENT,
    items: [
      { label: "Overview", href: "/stock-balance/dashboard", icon: LayoutDashboard },
      {
        label: "Balance",
        href: "/stock-balance/balance",
        icon: Warehouse,
        aliases: ["/stock-balance"],
      },
      { label: "Alerts", href: "/stock-alerts", icon: Bell },
      { label: "Inventory", href: "/ubex-inventory", icon: Package },
      { label: "Errors", href: "/stock-balance/errors", icon: AlertTriangle },
      { label: "History", href: "/stock-balance/history", icon: History },
      { label: "Settings", href: "/stock-balance/settings", icon: Settings2 },
    ],
  };
}

function awbModule(): PortalModule {
  return {
    id: "awb",
    domain: "orders",
    primaryHref: "/awb",
    shortLabel: "AWB",
    label: "AWB Lookup",
    icon: FileSearch,
    accent: AWB_ACCENT,
    items: [{ label: "Lookup", href: "/awb", icon: FileSearch }],
  };
}

function subscriptionsModule(): PortalModule {
  return {
    id: "subscriptions",
    domain: "finance",
    primaryHref: "/subscriptions",
    shortLabel: "Subs",
    label: "Subscriptions",
    icon: Receipt,
    adminOnly: true,
    accent: SUBSCRIPTIONS_ACCENT,
    items: [
      { label: "Dashboard", href: "/subscriptions/dashboard", icon: LayoutDashboard },
      { label: "Requests", href: "/subscriptions", icon: Receipt },
      { label: "Active", href: "/subscriptions/active", icon: History },
    ],
  };
}

function salesReportModule(): PortalModule {
  return {
    id: "salesReport",
    domain: "finance",
    primaryHref: "/sales-report",
    shortLabel: "Sales",
    label: "Sales Report",
    icon: BarChart3,
    adminOnly: true,
    accent: SUBSCRIPTIONS_ACCENT,
    items: [
      { label: "Daily sales", href: "/sales-report", icon: BarChart3 },
      { label: "Settings", href: "/sales-report/settings", icon: Settings2 },
    ],
  };
}

export function getPortalModules(showAdmin: boolean): PortalModule[] {
  const modules = [fulfillmentModule(), awbModule()];
  if (showAdmin) {
    modules.push(stockModule());
    modules.push(subscriptionsModule());
    modules.push(salesReportModule());
  }
  return modules;
}

/** Path prefixes that belong to a module (includes legacy aliases). */
function modulePathPrefixes(id: ModuleId): string[] {
  switch (id) {
    case "fulfillment":
      return ["/fulfillment", "/history"];
    case "stock":
      return ["/stock-balance", "/ubex-inventory", "/stock-alerts"];
    case "awb":
      return ["/awb"];
    case "subscriptions":
      return ["/subscriptions"];
    case "salesReport":
      return ["/sales-report"];
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
  { path: "/dashboard", title: "Overview" },
  { path: "/dashboard/analytics", title: "Analytics" },
  { path: "/account", title: "Account" },
  { path: "/design", title: "Design gallery" },
  { path: "/admin", title: "Admin" },
];

const MODULE_ROUTE_ENTRIES: RouteEntry[] = [
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
    title: "Overview",
    moduleId: "stock",
    moduleLabel: "Stock",
    accent: STOCK_ACCENT,
  },
  {
    path: "/stock-balance/balance",
    title: "Balance",
    moduleId: "stock",
    moduleLabel: "Stock",
    accent: STOCK_ACCENT,
  },
  {
    path: "/stock-balance",
    title: "Balance",
    moduleId: "stock",
    moduleLabel: "Stock",
    accent: STOCK_ACCENT,
  },
  {
    path: "/stock-balance/errors",
    title: "Errors",
    moduleId: "stock",
    moduleLabel: "Stock",
    accent: STOCK_ACCENT,
  },
  {
    path: "/stock-balance/history",
    title: "History",
    moduleId: "stock",
    moduleLabel: "Stock",
    accent: STOCK_ACCENT,
  },
  {
    path: "/stock-balance/settings",
    title: "Settings",
    moduleId: "stock",
    moduleLabel: "Stock",
    accent: STOCK_ACCENT,
  },
  {
    path: "/ubex-inventory",
    title: "Inventory",
    moduleId: "stock",
    moduleLabel: "Stock",
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
    path: "/subscriptions/dashboard",
    title: "Dashboard",
    moduleId: "subscriptions",
    moduleLabel: "Subscriptions",
    accent: SUBSCRIPTIONS_ACCENT,
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
  {
    path: "/sales-report/settings",
    title: "Settings",
    moduleId: "salesReport",
    moduleLabel: "Sales Report",
    accent: SUBSCRIPTIONS_ACCENT,
  },
  {
    path: "/stock-alerts",
    title: "Alerts",
    moduleId: "stock",
    moduleLabel: "Stock",
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
  // Aliases are legacy URLs of the SAME page: exact match only. A prefix match would light up
  // e.g. "Fulfillment list" (alias /fulfillment) on /fulfillment/dashboard as well.
  if (item.aliases?.includes(pathname)) return true;
  return pathname.startsWith(`${item.href}/`);
}

const OPEN_STORAGE_PREFIX = "portal.nav.open.";

export function getNavOpenKey(id: NavSectionId): string {
  return `${OPEN_STORAGE_PREFIX}${id}`;
}

export function groupModulesByDomain(modules: PortalModule[]): { domain: ModuleDomain; label: string; modules: PortalModule[] }[] {
  return DOMAIN_ORDER.map((domain) => ({
    domain,
    label: DOMAIN_LABEL[domain],
    modules: modules.filter((m) => m.domain === domain),
  })).filter((g) => g.modules.length > 0);
}

export function moduleDashboardHref(module: PortalModule): string {
  return (
    module.items.find((i) => i.label === "Dashboard")?.href ??
    module.items[0]?.href ??
    modulePathPrefixes(module.id)[0] ??
    HOME_HREF
  );
}

const SETTINGS_PATHS = ["/account", "/admin"];

export function isPathInSettings(pathname: string): boolean {
  return SETTINGS_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
