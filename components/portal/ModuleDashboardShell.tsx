import Link from "next/link";
import type { ModuleId } from "@/config/modules";
import { getPortalModules } from "@/config/modules";
import {
  DashboardChartGrid,
  DashboardHeader,
  DashboardKpiGrid,
  DashboardPage,
} from "@/components/dashboard/DashboardPage";

type Props = {
  moduleId: ModuleId;
  title: string;
  description: string;
  kpi?: React.ReactNode;
  charts?: React.ReactNode;
  children?: React.ReactNode;
};

export function ModuleDashboardShell({
  moduleId,
  title,
  description,
  kpi,
  charts,
  children,
}: Props) {
  const mod = getPortalModules(true).find((m) => m.id === moduleId)!;

  return (
    <DashboardPage moduleId={moduleId}>
      <DashboardHeader
        moduleId={moduleId}
        moduleLabel={mod.label}
        title={title}
        description={description}
      />
      {kpi ? <DashboardKpiGrid>{kpi}</DashboardKpiGrid> : null}
      {charts ? <DashboardChartGrid>{charts}</DashboardChartGrid> : null}
      {children}
    </DashboardPage>
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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-card border border-line bg-white p-4 shadow-soft transition hover:bg-canvas ${mod.accent.activeBg}`}
        >
          <p className={`text-[13px] font-medium ${mod.accent.activeText}`}>{link.label}</p>
          {link.description ? (
            <p className="mt-1 text-[12px] text-muted">{link.description}</p>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
