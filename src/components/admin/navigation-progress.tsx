"use client";
import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin top progress bar shown while an in-app link navigation is in flight.
 * (Used instead of a route-level loading.tsx, which in Next 15.5 production builds
 * stalls same-page <Link> navigations such as date-range and pagination links.)
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = React.useState(false);

  React.useEffect(() => setActive(false), [pathname, searchParams]);

  React.useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setActive(false), 15000);
    return () => clearTimeout(t);
  }, [active]);

  React.useEffect(() => {
    // Bubble phase: if the unsaved-changes guard cancelled the click, it stopped propagation and we never see it.
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || !a.href || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.hash && url.pathname === window.location.pathname) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setActive(true);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  if (!active) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[70] h-0.5 overflow-hidden bg-primary/15" role="progressbar" aria-label="Loading page">
      <div className="h-full w-1/3 bg-primary [animation:nav-progress_1.1s_ease-in-out_infinite]" />
    </div>
  );
}
