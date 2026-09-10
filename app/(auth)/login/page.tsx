import { LoginHero } from "@/components/auth/LoginHero";
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
    <LoginHero
      authMode={authMode}
      description={description}
      nextPath={getSafeNextPath(searchParams.next)}
    />
  );
}
