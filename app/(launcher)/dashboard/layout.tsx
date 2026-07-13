/**
 * Launcher layout — deliberately minimal. No Sidebar, no Topbar. The launcher is a
 * full-screen moment (design-plan.md Section 1), structurally separate from the
 * (shell) route group so there is zero sidebar/topbar markup to strip out.
 */
export default function LauncherLayout({ children }: { children: React.ReactNode }) {
  return <div className="relative min-h-screen bg-canvas">{children}</div>;
}
