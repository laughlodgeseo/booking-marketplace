import type { ReactNode } from "react";
import { AuthMotionBackdrop } from "@/components/auth/AuthMotionBackdrop";

export default function AdminAuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell relative min-h-dvh overflow-hidden bg-[var(--site-bg)]">
      <AuthMotionBackdrop />
      <div className="relative z-20 h-full">{children}</div>
    </div>
  );
}
