import { PackageCheck, Warehouse, BarChart3, type LucideIcon } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";

const HIGHLIGHTS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: PackageCheck, title: "Orders & fulfillment", text: "Match Ubex tracking and push to Shopify in a click." },
  { icon: Warehouse, title: "Stock in sync", text: "One warehouse pool across both stores, reviewed daily." },
  { icon: BarChart3, title: "Reports", text: "Daily sales for both stores, emailed and downloadable." },
];

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
    <div className="flex min-h-dvh bg-canvas">
      {/* Brand panel — desktop only */}
      <aside className="relative hidden w-[46%] max-w-[640px] flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 px-14 py-12 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl"
        />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.svg"
          alt="Seissense"
          className="relative h-8 w-auto self-start"
          style={{ filter: "brightness(0) invert(1)" }}
        />

        <div className="relative max-w-md">
          <h2 className="text-display font-semibold leading-[1.2] tracking-tight">
            One console for every moving part of the operation.
          </h2>
          <ul className="mt-9 space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-white/15">
                  <Icon size={19} />
                </span>
                <div>
                  <p className="text-heading font-medium">{title}</p>
                  <p className="mt-0.5 text-body leading-snug text-white/70">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-body text-white/60">© Seissense · Internal operations</p>
      </aside>

      {/* Form */}
      <main
        className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8"
        style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))", paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="w-full max-w-[400px] animate-fade-up">
          <div className="mb-8 flex flex-col items-start gap-6 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Seissense Ops" className="h-8 w-auto" />
          </div>

          <div className="rounded-sheet border border-line bg-white p-6 shadow-pop sm:p-8">
            <h1 className="text-display font-semibold tracking-tight text-ink">Welcome back</h1>
            <p className="mt-2 text-body leading-relaxed text-muted">{description}</p>
            <LoginForm nextPath={nextPath} authMode={authMode} />
          </div>

          <p className="mt-6 text-center text-body text-muted">Internal use only · Seissense Operations</p>
        </div>
      </main>
    </div>
  );
}
