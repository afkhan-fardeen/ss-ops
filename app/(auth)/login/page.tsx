import { LoginForm } from "@/components/auth/LoginForm";
import { getAuthMode } from "@/lib/auth/mode";

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
    <div className="bg-ambient flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-7 text-center">
        <div className="font-display text-[20px] font-semibold tracking-tight text-portal-text">
          Ops Portal
        </div>
        <div className="mt-1 text-[12px] font-medium text-portal-text3">Internal operations</div>
      </div>

      <div className="w-full max-w-sm rounded-card border border-portal-border bg-portal-bg2 p-7 shadow-pop">
        <h1 className="font-display text-xl font-semibold text-portal-text">Sign in</h1>
        <p className="mt-1 text-[13px] text-portal-text2">{description}</p>
        <LoginForm nextPath={searchParams.next ?? "/cod-list"} authMode={authMode} />
      </div>

      <p className="mt-6 font-mono text-[11px] text-portal-text3">Internal use only · Seissense Operations</p>
    </div>
  );
}
