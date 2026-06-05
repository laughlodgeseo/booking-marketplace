import type { ReactNode } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function HostOnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth redirectTo="/login?next=%2Fvendor%2Fonboarding">
      {children}
    </RequireAuth>
  );
}
