import type { ModuleId } from "@/config/modules";

type Props = {
  children: React.ReactNode;
  moduleId?: ModuleId | "home";
};

const BORDER: Record<string, string> = {
  home: "border-l-ink",
  cod: "border-l-cod",
  fulfillment: "border-l-fulfillment",
  stock: "border-l-stock",
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
  const border = moduleId ? BORDER[moduleId] : "border-l-ink";
  return (
    <header
      className={`animate-fade-up rounded-card border border-line border-l-4 bg-white p-5 shadow-soft ${border}`}
    >
      {moduleLabel ? (
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
          {moduleLabel}
        </p>
      ) : null}
      <h1 className="mt-0.5 font-display text-xl font-medium text-ink">{title}</h1>
      {description ? (
        <p className="mt-2 text-[13px] text-muted">{description}</p>
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
