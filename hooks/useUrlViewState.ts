"use client";

import { usePathname, useSearchParams } from "next/navigation";

/**
 * Mirrors view state (page, search, filter) into the URL for refresh/share, without
 * going through Next's router. `router.replace` triggers a real navigation — on a
 * force-dynamic page that means a full server round trip (re-running auth checks and
 * data fetches) just to rewrite the address bar. These components already fetch their
 * own data via `fetch()`, so the URL only needs to be a mirror: `history.replaceState`
 * updates it with no navigation and no server request.
 *
 * `searchParams` here is only for reading the initial value at mount (SSR/hydration-safe
 * via Next's hook); after that, read from local component state, not `searchParams`
 * again — it won't reflect writes made through `updateUrl`.
 */
export function useUrlViewState() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateUrl(updates: Record<string, string | number | null | undefined>) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    }
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  }

  return { searchParams, updateUrl };
}
