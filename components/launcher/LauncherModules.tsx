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
          <Link href={m.href} className="block h-full">
            <GlassCard layoutId={`module-${m.id}`} className="flex h-full flex-col p-6">
              <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-card ${m.iconBg}`}>
                <span className={m.iconText}>{m.icon}</span>
              </div>
              <h2 className="mt-5 font-display text-lg font-medium text-ink">{m.label}</h2>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-muted">{m.description}</p>
              <p className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink transition-transform group-hover:translate-x-0.5">
                Open <ArrowRight size={14} />
              </p>
            </GlassCard>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
