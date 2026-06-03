import Link from "next/link";
import type { ModuleId } from "@/config/modules";
import { getPortalModules } from "@/config/modules";

type Props = {
  moduleId: ModuleId;
  title: string;
  description: string;
  children?: React.ReactNode;
};

export function ModuleDashboardShell({ moduleId, title, description, children }: Props) {
  const mod = getPortalModules(true).find((m) => m.id === moduleId)!;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className={`animate-fade-up rounded-card border border-[#EBEBEB] border-l-4 bg-white p-5 shadow-soft ${moduleId === "cod" ? "border-l-blue-500" : moduleId === "fulfillment" ? "border-l-[#E57373]" : "border-l-emerald-500"}`}>
        <p className={`text-[11px] font-semibold uppercase tracking-wider ${mod.accent.activeText}`}>
          {mod.label}
        </p>
        <h1 className="mt-1 text-xl font-semibold text-[#111111]">{title}</h1>
        <p className="mt-2 text-[13px] text-[#555555]">{description}</p>
      </header>
      {children}
    </div>
  );
}

export function ModuleQuickLinks({
  moduleId,
  links,
}: {
  moduleId: ModuleId;
  links: { label: string; href: string; description?: string }[];
}) {
  const mod = getPortalModules(true).find((m) => m.id === moduleId)!;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-card border border-[#EBEBEB] bg-white p-4 shadow-soft transition hover:bg-[#FAFAFA] ${mod.accent.activeBg}`}
        >
          <p className={`text-[13px] font-semibold ${mod.accent.activeText}`}>{link.label}</p>
          {link.description ? (
            <p className="mt-1 text-[12px] text-[#555555]">{link.description}</p>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
