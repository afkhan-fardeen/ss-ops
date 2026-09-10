"use client";

import { motion } from "framer-motion";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoginAurora } from "@/components/auth/LoginAurora";
import { GlassCard } from "@/components/ui/GlassCard";
import { stagger, staggerItem } from "@/lib/motion";

/**
 * Login screen composition — the one deliberately dramatic "moment" in the portal.
 * Split out from page.tsx (a Server Component) because getAuthMode() reads
 * AUTH_PROVIDER, a non-public env var that must stay resolved on the server.
 */
export function LoginHero({
  authMode,
  description,
  nextPath,
}: {
  authMode: "supabase" | "shared";
  description: string;
  nextPath: string;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16">
      <LoginAurora />
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative z-10 flex w-full flex-col items-center"
      >
        <motion.div variants={staggerItem} className="mb-8 flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Seissense Ops" className="h-11 w-auto" />
          <div className="flex items-center gap-2 text-[13px] text-muted">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4CAF50] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#4CAF50]" />
            </span>
            Internal operations portal
          </div>
        </motion.div>

        <motion.div variants={staggerItem} className="w-full max-w-md">
          <GlassCard className="p-8">
            <h1 className="font-display text-2xl font-medium text-ink">Sign in</h1>
            <p className="mt-1.5 text-[13px] text-muted">{description}</p>
            <LoginForm nextPath={nextPath} authMode={authMode} />
          </GlassCard>
        </motion.div>

        <motion.p variants={staggerItem} className="mt-8 font-mono text-[11px] text-muted">
          Internal use only · Seissense Operations
        </motion.p>
      </motion.div>
    </div>
  );
}
