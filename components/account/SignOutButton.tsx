"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function SignOutButton() {
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
      className="focus-ring inline-flex h-10 items-center gap-2 rounded-card border border-[#EBEBEB] bg-white px-4 text-[13px] font-semibold text-[#111111] transition hover:bg-[#F7F7F7] disabled:opacity-60"
    >
      <LogOut size={15} strokeWidth={2.2} />
      <span>{loading ? "Signing out…" : "Sign out"}</span>
    </button>
  );
}
