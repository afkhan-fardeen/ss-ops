"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import {
  HOME_HREF,
  isNavItemActive,
  isPathInModule,
  type ModuleId,
  type PortalModule,
} from "@/config/modules";
import { getSettingsNavItems } from "@/config/navigation";

type Props = {
  open: boolean;
  module: PortalModule | null;
  showAdmin: boolean;
  onClose: () => void;
};

export function MobileModuleSheet({ open, module, showAdmin, onClose }: Props) {
  const pathname = usePathname();

  if (!open || !module) return null;

  const settings = getSettingsNavItems(showAdmin);

  return (
    <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-[#0F172A]/30"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto rounded-t-2xl border border-[#EBEBEB] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.12)]">
        <div className="flex items-center justify-between border-b border-[#EBEBEB] px-4 py-3">
          <p className={`text-[13px] font-semibold ${module.accent.activeText}`}>{module.label}</p>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring -m-1 rounded-md p-1 text-[#999999]"
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
                  active ? module.accent.activeBg + " " + module.accent.activeText : "text-[#555555]",
                ].join(" ")}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[#EBEBEB] p-2">
          <Link
            href={HOME_HREF}
            onClick={onClose}
            className="block rounded-lg px-3 py-2 text-[12px] font-medium text-[#999999] hover:bg-[#F7F7F7]"
          >
            Home dashboard
          </Link>
          {settings.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={[
                  "mt-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-[12px] font-medium",
                  active ? "bg-[#F7F7F7] text-[#111111]" : "text-[#999999]",
                ].join(" ")}
              >
                <Icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function mobileModuleActive(pathname: string, id: ModuleId): boolean {
  return isPathInModule(pathname, id);
}
