/** Shared "you don't have access to this module" panel — same wrapper across every gated page. */
export function ModuleAccessDenied({ description }: { description: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-card border border-line bg-white p-8 shadow-soft">
      <h1 className="text-lg font-medium text-ink">Access denied</h1>
      <p className="mt-2 text-[13px] text-muted">{description}</p>
    </div>
  );
}
