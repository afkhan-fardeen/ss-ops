import { isPortalAdmin } from "@/lib/auth/is-portal-admin";
import { HomeDashboard } from "@/components/portal/HomeDashboard";
import { loadPortalHomeSummary } from "@/lib/dashboard/load-portal-home-summary";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const showAdmin = await isPortalAdmin();
  const summary = await loadPortalHomeSummary(showAdmin);
  return <HomeDashboard showAdmin={showAdmin} summary={summary} />;
}
