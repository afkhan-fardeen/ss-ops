import Link from "next/link";

/**
 * Standalone report shell — deliberately no Sidebar/Topbar/command palette.
 * Whoever opens the emailed link (or clicks the module tile) sees only the
 * report itself, not the rest of the portal.
 */
export default function SalesReportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Seissense" className="h-6 w-auto" />
          <Link href="/dashboard" className="text-[12px] font-medium text-muted transition hover:text-ink">
            Seissense Ops Portal
          </Link>
        </div>
      </header>
      <main className="px-6 py-8">{children}</main>
    </div>
  );
}
