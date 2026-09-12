import { Settings2 } from "lucide-react";
import { requireSession } from "@/lib/auth/require-session";
import { isPortalAdmin } from "@/lib/auth/is-portal-admin";
import { getAstGreeting, getDisplayName } from "@/lib/dashboard/get-display-name";
import { loadLauncherStats, type LauncherStats } from "@/lib/dashboard/load-launcher-stats";
import { SETTINGS_ACCENT } from "@/config/modules";
import { getVisiblePortalModules } from "@/lib/auth/get-visible-modules";
import {
  LauncherModules,
  type LauncherModuleData,
  type LauncherSection,
} from "@/components/launcher/LauncherModules";
import { UbexIndicator } from "@/components/portal/UbexIndicator";
import { AstClock } from "@/components/portal/AstClock";
import { SignOutButton } from "@/components/account/SignOutButton";

export const dynamic = "force-dynamic";

type Domain = "orders" | "inventory" | "finance";

const MODULE_META: Record<string, { description: string; href: string; domain: Domain }> = {
  cod: {
    description: "Daily COD collection windows, rates, and email exports.",
    href: "/cod/list",
    domain: "orders",
  },
  fulfillment: {
    description: "Match Ubex tracking and push fulfillments to Shopify.",
    href: "/fulfillment/list",
    domain: "orders",
  },
  awb: {
    description: "Look up an order number and preview the UBEX Airway Bill PDF.",
    href: "/awb",
    domain: "orders",
  },
  stock: {
    description: "Compare Ubex inventory with Shopify and restock on hand.",
    href: "/stock-balance/balance",
    domain: "inventory",
  },
  stockAnalysis: {
    description: "Mismatch trends, catalog composition, and sync health over time.",
    href: "/stock-analysis/dashboard",
    domain: "inventory",
  },
  ubexInventory: {
    description: "Browse Ubex stock by product name.",
    href: "/ubex-inventory",
    domain: "inventory",
  },
  subscriptions: {
    description: "Review employee subscription requests and track active subscriptions.",
    href: "/subscriptions/dashboard",
    domain: "finance",
  },
  zohoBooks: {
    description: "Zoho Books tools.",
    href: "/zoho-books",
    domain: "finance",
  },
};

const DOMAIN_ORDER: Domain[] = ["orders", "inventory", "finance"];
const DOMAIN_LABEL: Record<Domain, string> = {
  orders: "Orders & Delivery",
  inventory: "Inventory",
  finance: "Finance",
};
const DOMAIN_DOT: Record<Domain, string> = {
  orders: "bg-cod",
  inventory: "bg-stock",
  finance: "bg-subscriptions",
};

export default async function LauncherPage() {
  const session = await requireSession();
  const showAdmin = await isPortalAdmin();
  const [name, stats] = await Promise.all([getDisplayName(session), loadLauncherStats()]);
  const greeting = getAstGreeting();
  const modules = await getVisiblePortalModules(session, showAdmin);
  const statByModule: Partial<Record<string, LauncherStats[keyof LauncherStats]>> = {
    cod: stats.cod,
    fulfillment: stats.fulfillment,
    stock: stats.stock,
    stockAnalysis: stats.stockAnalysis,
    subscriptions: stats.subscriptions,
  };

  const domainCards: Record<Domain, LauncherModuleData[]> = {
    orders: [],
    inventory: [],
    finance: [],
  };
  for (const m of modules) {
    const meta = MODULE_META[m.id];
    if (!meta) continue;
    const Icon = m.icon;
    domainCards[meta.domain].push({
      id: m.id,
      label: m.label,
      description: meta.description,
      href: meta.href,
      icon: <Icon size={22} strokeWidth={1.8} />,
      iconBg: m.accent.activeBg,
      iconText: m.accent.activeText,
      stat: statByModule[m.id],
    });
  }

  const sections: LauncherSection[] = DOMAIN_ORDER.filter((d) => domainCards[d].length > 0).map(
    (d) => ({
      id: d,
      label: DOMAIN_LABEL[d],
      dotColor: DOMAIN_DOT[d],
      modules: domainCards[d],
    }),
  );

  sections.push({
    id: "account",
    label: "Account",
    dotColor: "bg-gold",
    modules: [
      {
        id: "settings",
        label: "Account",
        description: "Your email, session, and sign out.",
        href: "/account",
        icon: <Settings2 size={22} strokeWidth={1.8} />,
        iconBg: SETTINGS_ACCENT.activeBg,
        iconText: SETTINGS_ACCENT.activeText,
        secondaryLink: showAdmin ? { label: "Admin tools", href: "/admin" } : undefined,
      },
    ],
  });

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-x-hidden px-6 py-6 sm:px-10 sm:py-8">
      <div className="flex w-full max-w-5xl flex-wrap items-center justify-between gap-y-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Seissense Ops" className="h-6 w-auto object-contain sm:h-7" />
        <div className="flex items-center gap-1.5 sm:gap-3">
          <UbexIndicator />
          <AstClock />
          <SignOutButton compact />
        </div>
      </div>

      <div className="w-full max-w-5xl flex-1 py-10 sm:py-14">
        <h1 className="font-display text-[26px] font-medium text-ink sm:text-[32px]">
          {name ? `${greeting}, ${name}` : "Welcome"}
        </h1>
        <p className="mt-1.5 text-[14px] text-muted sm:text-[15px]">Pick a module to get started.</p>

        <div className="mt-9 sm:mt-11">
          <LauncherModules sections={sections} />
        </div>
      </div>

      <p className="pb-2 text-[11px] text-muted">Internal use only · Seissense Operations</p>
    </div>
  );
}
