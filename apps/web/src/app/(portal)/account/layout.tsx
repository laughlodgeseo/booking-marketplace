import type { ReactNode } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireRole } from "@/components/auth/RequireRole";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth redirectTo="/login">
      {/* VENDOR role is allowed so hosts who started as customers retain account access */}
      <RequireRole roles={["CUSTOMER", "VENDOR"]} redirectTo="/">
        {children}
      </RequireRole>
    </RequireAuth>
  );
}
