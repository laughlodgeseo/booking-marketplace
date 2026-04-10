"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const Preloader = dynamic(() => import("@/components/tourm/Preloader"), {
  ssr: false,
  loading: () => null,
});

/** Paths where the preloader would interrupt a critical flow — skip there. */
const SKIP_PREFIXES = ["/checkout", "/payment"];

export default function PreloaderGate() {
  const pathname = usePathname();
  const path = (pathname ?? "").toLowerCase();
  const isSkipped = SKIP_PREFIXES.some((prefix) => path.startsWith(prefix));

  if (isSkipped) return null;

  // 3 000 ms minimum — oncePerSession is handled inside Preloader via sessionStorage
  return <Preloader minDurationMs={3000} oncePerSession />;
}
