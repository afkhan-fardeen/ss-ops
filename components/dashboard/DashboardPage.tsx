import type { ModuleId } from "@/config/modules";

type Props = {
  children: React.ReactNode;
  moduleId?: ModuleId | "home";
};

const BORDER: Record<string, string> = {
  home: "border-l-ink",
  fulfillment: "border-l-primary",
  stock: "border-l-primary",
  awb: "border-l-primary",
  subscriptions: "border-l-primary",
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
    <>
    {/* Phones: the top app bar already shows the page title, so only the description is kept. */}
    {description ? <p className="text-body text-muted md:hidden">{description}</p> : null}
    <header
      className={`animate-fade-up hidden rounded-card border border-line border-l-4 bg-white p-5 shadow-soft md:block ${border}`}
    >
      {moduleLabel ? (
        <p className="text-caption font-semibold uppercase tracking-wide max-md:normal-case max-md:tracking-normal text-muted">
          {moduleLabel}
        </p>
      ) : null}
      <h1 className="mt-0.5 font-sans text-title font-medium text-ink">{title}</h1>
      {description ? (
        <p className="mt-2 text-body text-muted">{description}</p>
      ) : null}
    </header>
    </>
  );
}

export function DashboardKpiGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>
  );
}

export function DashboardChartGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">{children}</div>
  );
}
