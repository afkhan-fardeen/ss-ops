"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, type LucideIcon } from "lucide-react";
import {
  HOME_ACCENT,
  HOME_HREF,
  isNavItemActive,
  isPathInModule,
  SETTINGS_ACCENT,
  type ModuleId,
  type PortalModule,
} from "@/config/modules";

type Props = {
  open: boolean;
  module: PortalModule | null;
  onClose: () => void;
};

export function MobileModuleSheet({ open, module, onClose }: Props) {
  const pathname = usePathname();

  if (!open || !module) return null;

  return (
    <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-ink/30"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto rounded-t-2xl border border-line bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.12)]">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className={`text-[13px] font-medium ${module.accent.activeText}`}>{module.label}</p>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring -m-1 rounded-md p-1 text-muted"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          {module.items.map((item) => {
            const Icon = item.icon;
            const active = isNavItemActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={[
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium",
                  active
                    ? `${module.accent.activeBg} ${module.accent.activeText}`
                    : "text-muted hover:bg-canvas",
                ].join(" ")}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line p-2">
          <Link
            href={HOME_HREF}
            onClick={onClose}
            className={`block rounded-lg px-3 py-2 text-[12px] font-medium ${HOME_ACCENT.labelText} hover:bg-canvas`}
          >
            Home dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

type SettingsSheetProps = {
  open: boolean;
  items: { label: string; href: string; icon: LucideIcon }[];
  onClose: () => void;
};

export function MobileSettingsSheet({ open, items, onClose }: SettingsSheetProps) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-ink/30"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[50vh] overflow-y-auto rounded-t-2xl border border-line bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.12)]">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className={`text-[13px] font-medium ${SETTINGS_ACCENT.activeText}`}>Settings</p>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring -m-1 rounded-md p-1 text-muted"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={[
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium",
                  active
                    ? `${SETTINGS_ACCENT.activeBg} ${SETTINGS_ACCENT.activeText}`
                    : "text-muted hover:bg-canvas",
                ].join(" ")}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function mobileModuleActive(pathname: string, id: ModuleId): boolean {
  return isPathInModule(pathname, id);
}
