"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { PropertyWizard } from "@/components/property-wizard/PropertyWizard";
import type { VendorPropertyDetail } from "@/lib/api/portal/vendor";

export default function VendorNewPropertyPage() {
  function handleCreated(property: VendorPropertyDetail) {
    // Update URL to edit route without losing wizard state
    window.history.replaceState(
      {},
      "",
      `/vendor/properties/${encodeURIComponent(property.id)}/edit`
    );
  }

  return (
    <RequireAuth>
      <PropertyWizard onCreated={handleCreated} />
    </RequireAuth>
  );
}
