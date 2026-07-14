import { LoginForm } from "@/components/auth/LoginForm";
import { GlassCard } from "@/components/ui/GlassCard";
import { getAuthMode } from "@/lib/auth/mode";
import { getSafeNextPath } from "@/lib/auth/safe-next-path";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const authMode = getAuthMode();
  const description =
    authMode === "supabase"
      ? "Sign in with your Seissense email to continue."
      : "Enter the portal password to continue.";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
      <div className="mb-7 flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Seissense Ops" className="h-10 w-auto" />
        <div className="text-[13px] text-muted">Internal operations portal</div>
      </div>

      <GlassCard className="w-full max-w-sm p-7">
        <h1 className="font-display text-xl font-medium text-ink">Sign in</h1>
        <p className="mt-1 text-[13px] text-muted">{description}</p>
        <LoginForm nextPath={getSafeNextPath(searchParams.next)} authMode={authMode} />
      </GlassCard>

      <p className="mt-6 font-mono text-[11px] text-muted">Internal use only · Seissense Operations</p>
    </div>
  );
}
