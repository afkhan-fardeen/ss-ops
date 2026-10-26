import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";

export type OverviewModule = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  stat?: { value: string; label: string } | null;
  /** Area colour classes (from the module's accent). */
  tint: { bg: string; text: string; rail: string };
};

export type OverviewSection = {
  id: string;
  label: string;
  /** Rail colour class for the area dot. */
  rail: string;
  modules: OverviewModule[];
};

export function ModuleGrid({ sections }: { sections: OverviewSection[] }) {
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.id}>
          <h2 className="mb-3 flex items-center gap-2 text-body-sm font-semibold uppercase tracking-wide max-md:normal-case max-md:tracking-normal text-muted">
            <span aria-hidden className={`h-2 w-2 rounded-full ${section.rail}`} />
            {section.label}
          </h2>
          {/* Phones: Material 3 list — one row per module, 72px, leading icon, trailing chevron */}
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-white shadow-soft md:hidden">
            {section.modules.map((m) => (
              <li key={m.id}>
                <Link href={m.href} className="flex min-h-[72px] items-center gap-4 px-4 py-3 active:bg-canvas">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${m.tint.bg} ${m.tint.text}`}>
                    {m.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body-lg font-medium text-ink">{m.label}</span>
                    <span className="block truncate text-body text-muted">
                      {m.stat ? (
                        <>
                          <span className="font-mono font-semibold text-ink">{m.stat.value}</span> {m.stat.label}
                        </>
                      ) : (
                        m.description
                      )}
                    </span>
                  </span>
                  <ChevronRight size={20} className="shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden grid-cols-1 gap-4 md:grid md:grid-cols-2 xl:grid-cols-3">
            {section.modules.map((m) => (
              <Link
                key={m.id}
                href={m.href}
                className="group flex h-full flex-col gap-3 rounded-card border border-line bg-white p-5 shadow-soft transition hover:shadow-pop"
              >
                <div className="flex items-start justify-between">
                  <div className={`grid h-10 w-10 place-items-center rounded-control ${m.tint.bg} ${m.tint.text}`}>
                    {m.icon}
                  </div>
                  <ArrowUpRight
                    size={16}
                    className="text-muted transition group-hover:text-ink"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-heading font-semibold text-ink">{m.label}</h3>
                  <p className="mt-1 text-body leading-relaxed text-muted">{m.description}</p>
                </div>
                {m.stat ? (
                  <div className="flex items-baseline gap-2 border-t border-line pt-3">
                    <span className="font-mono text-title font-semibold tabular-nums text-ink">
                      {m.stat.value}
                    </span>
                    <span className="text-body-sm text-muted">{m.stat.label}</span>
                  </div>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
