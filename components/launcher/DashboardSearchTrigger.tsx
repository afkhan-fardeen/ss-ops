"use client";

import { Search } from "lucide-react";
import { openCommandPalette } from "@/components/portal/CommandPalette";

/** Prominent search-styled entry point into the command palette, for the dashboard hero. */
export function DashboardSearchTrigger() {
  return (
    <button
      type="button"
      onClick={openCommandPalette}
      className="focus-ring mt-4 flex w-full max-w-sm items-center gap-2.5 rounded-card border border-line bg-white px-3.5 py-2.5 text-left text-[13px] text-muted shadow-soft transition hover:border-ink/20 hover:text-ink"
    >
      <Search size={15} className="shrink-0" />
      <span className="flex-1">Jump to a module or page…</span>
      <kbd className="shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
    </button>
  );
}
