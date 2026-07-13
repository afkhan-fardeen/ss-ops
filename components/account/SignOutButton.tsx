"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Signed out");
      window.location.href = "/login";
    } catch {
      toast.error("Could not sign out");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={loading}
      title="Sign out"
      className={[
        "focus-ring inline-flex h-10 items-center gap-2 rounded-card border border-line bg-white text-[13px] font-medium text-ink transition hover:bg-canvas disabled:opacity-60",
        compact ? "px-2.5 sm:px-4" : "px-4",
      ].join(" ")}
    >
      <LogOut size={15} strokeWidth={2.2} />
      <span className={compact ? "hidden sm:inline" : ""}>
        {loading ? "Signing out…" : "Sign out"}
      </span>
    </button>
  );
}
