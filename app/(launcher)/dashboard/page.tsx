import { Settings2 } from "lucide-react";
import { requireSession } from "@/lib/auth/require-session";
import { isPortalAdmin } from "@/lib/auth/is-portal-admin";
import { getAstGreeting, getDisplayName } from "@/lib/dashboard/get-display-name";
import { getPortalModules, SETTINGS_ACCENT } from "@/config/modules";
import { LauncherModules, type LauncherModuleData } from "@/components/launcher/LauncherModules";
import { UbexIndicator } from "@/components/portal/UbexIndicator";
import { AstClock } from "@/components/portal/AstClock";
import { SignOutButton } from "@/components/account/SignOutButton";

export const dynamic = "force-dynamic";

const MODULE_META: Record<string, { description: string; href: string }> = {
  cod: {
    description: "Daily COD collection windows, rates, and email exports.",
    href: "/cod/list",
  },
  fulfillment: {
    description: "Match Ubex tracking and push fulfillments to Shopify.",
    href: "/fulfillment/list",
  },
  stock: {
    description: "Compare Ubex inventory with Shopify and restock on hand.",
    href: "/stock-balance/balance",
  },
  awb: {
    description: "Look up an order number and preview the UBEX Airway Bill PDF.",
    href: "/awb",
  },
};

export default async function LauncherPage() {
  const session = await requireSession();
  const showAdmin = await isPortalAdmin();
  const [name] = await Promise.all([getDisplayName(session)]);
  const greeting = getAstGreeting();
  const modules = getPortalModules(showAdmin);

  const moduleData: LauncherModuleData[] = modules.map((m) => {
    const meta = MODULE_META[m.id] ?? { description: "", href: "/dashboard" };
    const Icon = m.icon;
    return {
      id: m.id,
      label: m.label,
      description: meta.description,
      href: meta.href,
      icon: <Icon size={22} strokeWidth={1.8} />,
      iconBg: m.accent.activeBg,
      iconText: m.accent.activeText,
    };
  });

  const settingsCard: LauncherModuleData = {
    id: "settings",
    label: "Settings",
    description: "Manage your account and portal preferences.",
    href: "/account",
    icon: <Settings2 size={22} strokeWidth={1.8} />,
    iconBg: SETTINGS_ACCENT.activeBg,
    iconText: SETTINGS_ACCENT.activeText,
    secondaryLink: showAdmin ? { label: "Admin tools", href: "/admin" } : undefined,
  };

  const cards: LauncherModuleData[] = [...moduleData, settingsCard];

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden px-6 py-6 sm:px-10 sm:py-8">
      <div className="flex w-full max-w-5xl flex-wrap items-center justify-between gap-y-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Seissense Ops" className="h-6 w-auto object-contain sm:h-7" />
        <div className="flex items-center gap-1.5 sm:gap-3">
          <UbexIndicator />
          <AstClock />
          <SignOutButton compact />
        </div>
      </div>

      <div className="flex w-full max-w-5xl flex-1 flex-col items-center justify-center py-10 text-center sm:py-14">
        <h1 className="font-display text-[28px] font-medium text-ink sm:text-4xl">
          {name ? `${greeting}, ${name}` : "Welcome"}
        </h1>
        <p className="mt-2 text-[14px] text-muted sm:text-[15px]">Pick a module to get started.</p>

        <div className="mt-10 w-full sm:mt-14">
          <LauncherModules modules={cards} />
        </div>
      </div>

      <p className="pb-2 text-[11px] text-muted">Internal use only · Seissense Operations</p>
    </div>
  );
}
