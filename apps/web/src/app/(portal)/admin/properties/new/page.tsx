"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { AdminPropertyWizard } from "@/components/property-wizard/AdminPropertyWizard";

export default function AdminNewPropertyPage() {
  return (
    <RequireAuth>
      <AdminPropertyWizard />
    </RequireAuth>
  );
}
