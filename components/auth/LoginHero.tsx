"use client";

import { motion } from "framer-motion";
import { LoginForm } from "@/components/auth/LoginForm";
import { easeOut, stagger, staggerItem } from "@/lib/motion";

const DOMAINS = ["Shopify", "Ubex", "Fulfillment", "Finance"];

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
    <div className="relative flex min-h-screen">
      <aside className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-ink px-14 py-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
          aria-hidden="true"
        />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.svg"
          alt="Seissense"
          className="relative h-8 w-auto"
          style={{ filter: "invert(1) brightness(1.8)" }}
        />

        <div className="relative max-w-sm">
          <h2 className="font-display text-[28px] font-medium leading-[1.25] text-white">
            One console for every moving part of the operation.
          </h2>
          <p className="mt-4 text-[14px] leading-relaxed text-white/50">
            Orders, fulfillment, stock, and finance — brought into a single
            internal system built for the way the team actually works.
          </p>
        </div>

        <div className="relative flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-medium uppercase tracking-wider text-white/35">
          {DOMAINS.map((d, i) => (
            <span key={d} className="flex items-center gap-5">
              {d}
              {i < DOMAINS.length - 1 ? (
                <span className="h-1 w-1 rounded-full bg-white/20" />
              ) : null}
            </span>
          ))}
        </div>
      </aside>

      <div className="flex flex-1 flex-col items-center justify-center bg-canvas px-6 py-16 lg:px-16">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="w-full max-w-[360px]"
        >
          <motion.div
            variants={staggerItem}
            className="mb-9 flex items-center gap-3 lg:hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Seissense Ops" className="h-8 w-auto" />
          </motion.div>

          <motion.div variants={staggerItem}>
            <h1 className="font-display text-[26px] font-medium text-ink">Sign in</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">{description}</p>
          </motion.div>

          <motion.div variants={staggerItem} transition={easeOut}>
            <LoginForm nextPath={nextPath} authMode={authMode} />
          </motion.div>

          <motion.p variants={staggerItem} className="mt-10 text-[12px] text-muted">
            Internal use only · Seissense Operations
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
