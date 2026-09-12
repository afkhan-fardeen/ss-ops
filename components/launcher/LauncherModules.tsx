"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { stagger, staggerItem } from "@/lib/motion";

export type LauncherModuleData = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  iconText: string;
  /** Optional secondary action rendered below the primary card content (e.g. Admin tools). */
  secondaryLink?: { label: string; href: string };
};

export type LauncherSection = {
  id: string;
  label: string;
  dotColor: string;
  modules: LauncherModuleData[];
};

export function LauncherModules({ sections }: { sections: LauncherSection[] }) {
  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="w-full space-y-9">
      {sections.map((section) => (
        <div key={section.id}>
          <div className="mb-3.5 flex items-center gap-2 px-0.5">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${section.dotColor}`} />
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              {section.label}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {section.modules.map((m) => (
              <motion.div key={m.id} variants={staggerItem}>
                <ModuleCard module={m} />
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

function ModuleCard({ module: m }: { module: LauncherModuleData }) {
  return (
    <GlassCard layoutId={`module-${m.id}`} className="group h-full text-left">
      <Link href={m.href} className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between">
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-card ${m.iconBg}`}>
            <span className={m.iconText}>{m.icon}</span>
          </div>
          <ArrowUpRight
            size={16}
            className="mt-1 text-muted transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink"
          />
        </div>
        <div>
          <h3 className="font-display text-[15px] font-medium text-ink">{m.label}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">{m.description}</p>
        </div>
      </Link>
      {m.secondaryLink ? (
        <Link
          href={m.secondaryLink.href}
          className="mx-5 mb-5 -mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-muted transition-colors hover:text-ink"
        >
          {m.secondaryLink.label} <ArrowUpRight size={12} />
        </Link>
      ) : null}
    </GlassCard>
  );
}
