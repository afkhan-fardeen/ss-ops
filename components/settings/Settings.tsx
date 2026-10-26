import type { ReactNode } from "react";

/** Shared building blocks for every module's Settings page, so they all look and read the same. */

export function SettingsPage({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-3xl space-y-6">{children}</div>;
}

export function SettingsHeader({
  module,
  title,
  description,
}: {
  module: string;
  title: string;
  description?: string;
}) {
  return (
    <header>
      <p className="hidden text-body-sm font-semibold uppercase tracking-wide text-primary md:block">{module}</p>
      <h1 className="mt-1 hidden text-display font-semibold tracking-tight text-ink md:block">{title}</h1>
      {description ? <p className="text-body leading-relaxed text-muted md:mt-2">{description}</p> : null}
    </header>
  );
}

export function SettingsSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-card border border-line bg-white shadow-soft">
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-heading font-semibold text-ink">{title}</h2>
          {description ? <p className="mt-0.5 text-body text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="divide-y divide-line">{children}</div>
    </section>
  );
}

export type SettingState = "ok" | "default" | "off" | "warn";

const STATE_STYLES: Record<SettingState, string> = {
  ok: "bg-success-soft text-success",
  default: "bg-canvas text-muted",
  off: "bg-canvas text-muted",
  warn: "bg-warning-soft text-warning",
};

export function StateBadge({ state, children }: { state: SettingState; children: ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-body-sm font-medium ${STATE_STYLES[state]}`}>
      {children}
    </span>
  );
}

/** One setting: label + hint on the left, value (and optional state badge) on the right; stacks on mobile. */
export function SettingRow({
  label,
  hint,
  value,
  mono = false,
  state,
  stateLabel,
  children,
}: {
  label: string;
  hint?: string;
  value?: string | null;
  mono?: boolean;
  state?: SettingState;
  stateLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5">
      <div className="min-w-0">
        <p className="text-body font-medium text-ink">{label}</p>
        {hint ? <p className="mt-0.5 text-body leading-snug text-muted">{hint}</p> : null}
      </div>
      <div className="flex min-w-0 items-center gap-2 sm:max-w-[55%] sm:justify-end">
        {value != null ? (
          <span className={`min-w-0 break-all text-body text-ink ${mono ? "" : ""}`}>{value}</span>
        ) : null}
        {state ? <StateBadge state={state}>{stateLabel ?? state}</StateBadge> : null}
        {children}
      </div>
    </div>
  );
}

export function SettingsFootnote({ children }: { children: ReactNode }) {
  return <p className="px-1 text-body leading-relaxed text-muted">{children}</p>;
}
