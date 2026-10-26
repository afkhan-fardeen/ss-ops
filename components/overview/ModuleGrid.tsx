import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export type OverviewModule = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  stat?: { value: string; label: string } | null;
};

export type OverviewSection = {
  id: string;
  label: string;
  modules: OverviewModule[];
};

export function ModuleGrid({ sections }: { sections: OverviewSection[] }) {
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.id}>
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-muted">
            {section.label}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {section.modules.map((m) => (
              <Link
                key={m.id}
                href={m.href}
                className="group flex h-full flex-col gap-3 rounded-card border border-line bg-white p-5 shadow-soft transition hover:border-primary/40 hover:shadow-pop"
              >
                <div className="flex items-start justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary">
                    {m.icon}
                  </div>
                  <ArrowUpRight
                    size={16}
                    className="text-muted transition group-hover:text-primary"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-[14px] font-semibold text-ink">{m.label}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{m.description}</p>
                </div>
                {m.stat ? (
                  <div className="flex items-baseline gap-1.5 border-t border-line pt-3">
                    <span className="font-mono text-[18px] font-semibold tabular-nums text-ink">
                      {m.stat.value}
                    </span>
                    <span className="text-[12px] text-muted">{m.stat.label}</span>
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
