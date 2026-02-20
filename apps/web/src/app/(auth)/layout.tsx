"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { AuthFlowRouter } from "@/components/auth/AuthFlowRouter";
import { AuthMotionBackdrop } from "@/components/auth/AuthMotionBackdrop";
import { panelFromPath } from "@/components/auth/authFlow";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const panel = panelFromPath(pathname);

  return (
    <div className="auth-shell relative min-h-dvh overflow-hidden bg-[var(--site-bg)]">
      <AuthMotionBackdrop />
      <div className="relative z-20 h-full">
        {panel ? (
          <Suspense fallback={children}>
            <AuthFlowRouter panel={panel} />
          </Suspense>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
