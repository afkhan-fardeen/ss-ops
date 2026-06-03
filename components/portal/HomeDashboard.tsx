import Link from "next/link";
import { ListChecks, PackageCheck, Scale } from "lucide-react";
import { getPortalModules } from "@/config/modules";

type Props = { showAdmin: boolean };

export function HomeDashboard({ showAdmin }: Props) {
  const modules = getPortalModules(showAdmin);

  const cards = [
    {
      module: modules.find((m) => m.id === "cod")!,
      description: "Daily COD collection windows, rates, and email exports.",
      href: "/cod/list",
    },
    {
      module: modules.find((m) => m.id === "fulfillment")!,
      description: "Match Ubex tracking and push fulfillments to Shopify.",
      href: "/fulfillment/list",
    },
    ...(showAdmin
      ? [
          {
            module: modules.find((m) => m.id === "stock")!,
            description: "Compare Ubex inventory with Shopify and restock on hand.",
            href: "/stock-balance/balance",
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="animate-fade-up">
        <h1 className="text-xl font-semibold text-[#111111]">Home</h1>
        <p className="mt-1 text-[13px] text-[#555555]">
          Seissense Ops — choose a module to get started.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ module, description, href }) => {
          const Icon =
            module.id === "cod"
              ? ListChecks
              : module.id === "fulfillment"
                ? PackageCheck
                : Scale;
          return (
            <Link
              key={module.id}
              href={href}
              className={[
                "group animate-fade-up rounded-card border border-[#EBEBEB] bg-white p-5 shadow-soft transition hover:border-[#DDDDDD]",
                "border-l-4",
                module.id === "cod"
                  ? "border-l-blue-500"
                  : module.id === "fulfillment"
                    ? "border-l-[#E57373]"
                    : "border-l-emerald-500",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-card ${module.accent.activeBg}`}
                >
                  <Icon size={20} className={module.accent.activeText} />
                </div>
                <div className="min-w-0">
                  <h2 className={`text-[15px] font-semibold ${module.accent.activeText}`}>
                    {module.label}
                  </h2>
                  <p className="mt-1 text-[12px] leading-snug text-[#555555]">{description}</p>
                </div>
              </div>
              <p className="mt-4 text-[12px] font-medium text-[#111111] group-hover:underline">
                Open module →
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
