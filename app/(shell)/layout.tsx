import { requireSession } from "@/lib/auth/require-session";
import { isPortalAdmin } from "@/lib/auth/is-portal-admin";
import {
  getVisiblePortalModules,
  moduleIdsFromVisible,
} from "@/lib/auth/get-visible-modules";
import { PortalStockBalanceShell } from "@/components/portal/PortalStockBalanceShell";
import { Sidebar } from "@/components/portal/Sidebar";
import { Topbar } from "@/components/portal/Topbar";

// On desktop: restore sidebar width from localStorage.
// On mobile: always 0 (sidebar is hidden, bottom tab bar is used instead).
const BOOT_SCRIPT = `
(function(){try{
  var isMd = window.matchMedia && window.matchMedia('(min-width: 768px)').matches;
  var w = isMd ? (localStorage.getItem('portal.sidebar.collapsed')==='1' ? '64px' : '248px') : '0px';
  document.documentElement.style.setProperty('--sb-w', w);
}catch(e){document.documentElement.style.setProperty('--sb-w','0px');}})();
`;

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const showAdminLink = await isPortalAdmin();
  const visibleModules = await getVisiblePortalModules(session, showAdminLink);
  const allowedModuleIds = moduleIdsFromVisible(visibleModules);
  const showStock = allowedModuleIds.includes("stock");

  return (
    <div className="overflow-x-hidden">
      <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      <Sidebar
        showAdminLink={showAdminLink}
        allowedModuleIds={allowedModuleIds}
      />
      {/* On mobile margin-left is 0; on md+ it follows --sb-w */}
      <div
        style={{ marginLeft: "var(--sb-w, 0px)" }}
        className="flex min-h-screen flex-col bg-transparent text-ink transition-[margin] duration-200"
      >
        <Topbar />
        {/* pb-24 on mobile so content doesn't hide behind the fixed bottom tab bar */}
        <main className="flex-1 overflow-x-hidden px-4 pb-28 pt-4 md:px-8 md:pb-8 md:pt-6">
          <PortalStockBalanceShell enabled={showStock}>{children}</PortalStockBalanceShell>
        </main>
      </div>
    </div>
  );
}
