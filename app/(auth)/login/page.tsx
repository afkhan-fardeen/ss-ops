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
    <div className="flex min-h-screen flex-col items-center justify-center bg-page px-4">
      <div className="mb-7 flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Seissense Ops" className="h-10 w-auto" />
        <div className="text-[13px] text-[#999999]">Internal operations portal</div>
      </div>

      <div className="w-full max-w-sm rounded-card border border-[#EBEBEB] bg-white p-7 shadow-pop">
        <h1 className="text-xl font-semibold text-[#111111]">Sign in</h1>
        <p className="mt-1 text-[13px] text-[#555555]">{description}</p>
        <LoginForm nextPath={searchParams.next ?? "/cod-list"} authMode={authMode} />
      </div>

      <p className="mt-6 font-mono text-[11px] text-[#999999]">Internal use only · Seissense Operations</p>
    </div>
  );
}
