import type { ModuleId } from "@/config/modules";

type Props = {
  children: React.ReactNode;
  moduleId?: ModuleId | "home";
};

const BORDER: Record<string, string> = {
  home: "border-l-slate-500",
  cod: "border-l-blue-500",
  fulfillment: "border-l-[#E57373]",
  stock: "border-l-emerald-500",
};

export function DashboardPage({ children, moduleId }: Props) {
  const border = moduleId ? BORDER[moduleId] : undefined;
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {children}
    </div>
  );
}

export function DashboardHeader({
  moduleLabel,
  title,
  description,
  moduleId,
}: {
  moduleLabel?: string;
  title: string;
  description?: string;
  moduleId?: ModuleId | "home";
}) {
  const border = moduleId ? BORDER[moduleId] : "border-l-slate-500";
  return (
    <header
      className={`animate-fade-up rounded-card border border-[#EBEBEB] border-l-4 bg-white p-5 shadow-soft ${border}`}
    >
      {moduleLabel ? (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#999999]">
          {moduleLabel}
        </p>
      ) : null}
      <h1 className="mt-0.5 text-xl font-semibold text-[#111111]">{title}</h1>
      {description ? (
        <p className="mt-2 text-[13px] text-[#555555]">{description}</p>
      ) : null}
    </header>
  );
}

export function DashboardKpiGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
  );
}

export function DashboardChartGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">{children}</div>
  );
}
