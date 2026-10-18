"use client";
import * as React from "react";

/**
 * Records one page view per load, then reports active (visible-tab) reading time when the
 * reader leaves. No third-party scripts; data goes only to this site's /api/track endpoint.
 */
export function ViewTracker({ postId }: { postId: string }) {
  React.useEffect(() => {
    if (navigator.doNotTrack === "1") return;
    let viewId: string | null = null;
    let activeMs = 0;
    let since = document.visibilityState === "visible" ? Date.now() : 0;
    let sent = false;

    const params = new URLSearchParams(window.location.search);
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "view", postId, path: window.location.pathname, referrer: document.referrer || null,
        utmSource: params.get("utm_source"), utmMedium: params.get("utm_medium"),
      }),
      keepalive: true,
    }).then((r) => r.json()).then((j) => { viewId = j.viewId ?? null; }).catch(() => {});

    const flush = () => {
      if (since) { activeMs += Date.now() - since; since = 0; }
      if (!viewId || sent || activeMs < 1000) return;
      sent = true;
      navigator.sendBeacon("/api/track", new Blob([JSON.stringify({ type: "engagement", viewId, seconds: Math.round(activeMs / 1000) })], { type: "application/json" }));
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
      else if (!sent) since = Date.now();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [postId]);
  return null;
}
