"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

type MaybeConnection = {
  effectiveType?: string;
  saveData?: boolean;
};

type NavigatorWithHints = Navigator & {
  connection?: MaybeConnection;
  deviceMemory?: number;
};

const Preloader = dynamic(() => import("@/components/tourm/Preloader"), {
  ssr: false,
  loading: () => null,
});

function shouldEnablePreloader(): boolean {
  const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
  if (!isDesktop) return false;

  const nav = navigator as NavigatorWithHints;
  const connection = nav.connection;
  const isConstrainedNetwork =
    connection?.saveData === true ||
    connection?.effectiveType === "slow-2g" ||
    connection?.effectiveType === "2g" ||
    connection?.effectiveType === "3g";

  if (isConstrainedNetwork) return false;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) return false;
  if (typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4) return false;

  return true;
}

export default function PreloaderGate() {
  const enabled = useMemo(() => {
    if (typeof window === "undefined") return false;
    return shouldEnablePreloader();
  }, []);

  if (!enabled) return null;
  return <Preloader />;
}
