/**
 * Fixed decorative grid behind all pages. Sides are slightly stronger; center is softer.
 * Must sit in root layout; content uses higher z-index.
 */
export function SubtlePageGrid() {
  return <div className="subtle-page-grid" aria-hidden="true" />;
}
