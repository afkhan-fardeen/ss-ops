"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
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
  /** Optional secondary action rendered below the primary "Open" link (e.g. Admin tools). */
  secondaryLink?: { label: string; href: string };
};

export function LauncherModules({ modules }: { modules: LauncherModuleData[] }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      {modules.map((m) => (
        <motion.div key={m.id} variants={staggerItem}>
          <GlassCard
            layoutId={`module-${m.id}`}
            className="flex h-full flex-col items-center p-6 text-center"
          >
            <Link href={m.href} className="flex flex-1 flex-col items-center">
              <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-card ${m.iconBg}`}>
                <span className={m.iconText}>{m.icon}</span>
              </div>
              <h2 className="mt-5 font-display text-lg font-medium text-ink">{m.label}</h2>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-muted">{m.description}</p>
              <p className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink transition-transform group-hover:translate-x-0.5">
                Open <ArrowRight size={14} />
              </p>
            </Link>
            {m.secondaryLink ? (
              <Link
                href={m.secondaryLink.href}
                className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-muted transition-colors hover:text-ink"
              >
                {m.secondaryLink.label} <ArrowRight size={12} />
              </Link>
            ) : null}
          </GlassCard>
        </motion.div>
      ))}
    </motion.div>
  );
}
