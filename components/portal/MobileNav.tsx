"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Home, LayoutGrid, LogOut, Search, Shield, User2, X, type LucideIcon } from "lucide-react";
import {
  groupModulesByDomain,
  HOME_HREF,
  isPathInModule,
  type ModuleId,
  type PortalModule,
} from "@/config/modules";
import { openCommandPalette } from "@/components/portal/CommandPalette";
import { InstallAppCard } from "@/components/pwa/InstallAppCard";

/** Modules that get a dedicated bottom tab, in priority order. Everything else lives behind the FAB. */
const PINNED_ORDER: ModuleId[] = ["fulfillment", "stock", "awb", "subscriptions"];
const PINNED_SLOTS = 2;

function Tab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "flex h-[72px] flex-1 flex-col items-center justify-center gap-1 text-fs11 font-medium transition-colors",
        active ? "text-primary" : "text-muted active:text-ink",
      ].join(" ")}
    >
      <span
        className={[
          "grid h-8 w-16 place-items-center rounded-full transition-colors duration-200",
          active ? "bg-primary-soft" : "",
        ].join(" ")}
      >
        <Icon size={20} strokeWidth={active ? 2.3 : 1.9} />
      </span>
      <span className="leading-none">{label}</span>
    </Link>
  );
}

export function MobileNav({
  modules,
  showAdminLink,
}: {
  modules: PortalModule[];
  showAdminLink: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pinned = useMemo(
    () =>
      PINNED_ORDER.map((id) => modules.find((m) => m.id === id))
        .filter((m): m is PortalModule => Boolean(m))
        .slice(0, PINNED_SLOTS),
    [modules],
  );

  const accountActive = pathname.startsWith("/account") || pathname.startsWith("/admin");
  const [first, second] = pinned;

  return (
    <>
      {open ? <MenuSheet modules={modules} showAdminLink={showAdminLink} onClose={() => setOpen(false)} /> : null}

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white shadow-[0_-1px_3px_rgba(15,23,42,0.06)] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="relative flex items-stretch">
          {/* left of the FAB */}
          <Tab href={HOME_HREF} label="Home" icon={Home} active={pathname === HOME_HREF} />
          {first ? (
            <Tab
              href={first.primaryHref}
              label={first.shortLabel ?? first.label}
              icon={first.icon}
              active={isPathInModule(pathname, first.id)}
            />
          ) : null}

          {/* space for the FAB */}
          <div className="w-[72px] shrink-0" aria-hidden />

          {/* right of the FAB */}
          {second ? (
            <Tab
              href={second.primaryHref}
              label={second.shortLabel ?? second.label}
              icon={second.icon}
              active={isPathInModule(pathname, second.id)}
            />
          ) : null}
          <Tab href="/account" label="Account" icon={User2} active={accountActive} />

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="focus-ring absolute left-1/2 top-0 grid h-14 w-14 -translate-x-1/2 -translate-y-4 place-items-center rounded-2xl bg-primary text-white shadow-[0_4px_12px_rgba(79,70,229,0.4)] transition-transform active:scale-95"
          >
            <span className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`}>
              {open ? <X size={24} /> : <LayoutGrid size={24} />}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}

function MenuSheet({
  modules,
  showAdminLink,
  onClose,
}: {
  modules: PortalModule[];
  showAdminLink: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const groups = groupModulesByDomain(modules);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="animate-backdrop absolute inset-0 bg-ink/40"
      />
      <div
        className="animate-sheet-up absolute inset-x-0 flex max-h-[calc(100dvh-var(--mobile-nav-h)-48px)] flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop"
        style={{ bottom: "var(--mobile-nav-h)" }}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line" aria-hidden />

        <div className="overflow-y-auto overscroll-contain px-4 pb-8 pt-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              openCommandPalette();
            }}
            className="focus-ring flex min-h-12 w-full items-center gap-2.5 rounded-xl border border-line bg-canvas px-3.5 text-[15px] text-muted active:bg-line/40"
          >
            <Search size={17} />
            Search modules and pages…
          </button>

          <div className="mt-4">
            <InstallAppCard />
          </div>

          {groups.map((g) => (
            <section key={g.domain} className="mt-5">
              <h2 className="px-1 pb-2 text-fs12 font-semibold uppercase tracking-wide max-md:normal-case max-md:tracking-normal text-muted">{g.label}</h2>
              <ul className="grid grid-cols-3 gap-2.5">
                {g.modules.map((m) => {
                  const Icon = m.icon;
                  const active = isPathInModule(pathname, m.id);
                  return (
                    <li key={m.id}>
                      <Link
                        href={m.primaryHref}
                        className={[
                          "flex h-full min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl border px-1.5 py-3 text-center transition-colors",
                          active
                            ? "border-primary/30 bg-primary-soft"
                            : "border-line bg-white active:bg-canvas",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "grid h-11 w-11 place-items-center rounded-xl",
                            active ? "bg-primary text-white" : "bg-primary-soft text-primary",
                          ].join(" ")}
                        >
                          <Icon size={22} strokeWidth={1.9} />
                        </span>
                        <span className="text-fs13 font-medium leading-tight text-ink">{m.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          <section className="mt-6 space-y-1 border-t border-line pt-3">
            {showAdminLink ? (
              <Link
                href="/admin"
                className="flex min-h-12 items-center gap-3 rounded-xl px-2 text-[15px] font-medium text-ink active:bg-canvas"
              >
                <Shield size={19} strokeWidth={1.9} className="text-muted" />
                Admin tools
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void logout()}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-[15px] font-medium text-red-700 active:bg-red-50"
            >
              <LogOut size={19} strokeWidth={1.9} />
              Sign out
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
