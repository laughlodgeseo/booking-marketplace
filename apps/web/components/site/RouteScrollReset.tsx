"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function RouteScrollReset() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Preserve hash-anchor navigations (e.g. /owners#owner-programs).
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
