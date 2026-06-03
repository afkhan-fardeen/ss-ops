import { isPortalAdmin } from "@/lib/auth/is-portal-admin";
import { HomeDashboard } from "@/components/portal/HomeDashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const showAdmin = await isPortalAdmin();
  return <HomeDashboard showAdmin={showAdmin} />;
}
