import type { ReactNode } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireRole } from "@/components/auth/RequireRole";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth redirectTo="/admin/login">
      <RequireRole roles={["ADMIN"]} redirectTo="/">
        {children}
      </RequireRole>
    </RequireAuth>
  );
}
