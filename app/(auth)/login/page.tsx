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
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="mb-7 text-center">
        <div className="text-[22px] font-semibold tracking-tight text-[#111111]">
          Seissense Ops
        </div>
        <div className="mt-1 text-[13px] text-[#999999]">Internal operations portal</div>
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
