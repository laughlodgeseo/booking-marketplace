"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalLoadingCard } from "@/components/portal/ui/PortalLoadingCard";
import {
  createVendorBlockRequest,
  getVendorCalendar,
} from "@/lib/api/portal/vendor";

const PortalAvailabilityCalendar = dynamic(
  () => import("@/components/portal/calendar/PortalAvailabilityCalendar").then((mod) => mod.PortalAvailabilityCalendar),
  {
    ssr: false,
    loading: () => <PortalLoadingCard kind="calendar" />,
  },
);

export default function VendorCalendarPage() {
  const tPortal = useTranslations("portal");

  return (
    <PortalShell
      role="vendor"
      title={tPortal("calendar.pageTitle")}
      subtitle={tPortal("calendar.vendorSubtitle")}
    >
      <PortalAvailabilityCalendar
        role="vendor"
        allowBlockControls
        blockControlMode="request"
        loadData={async ({ from, to, propertyId }) =>
          getVendorCalendar({ from, to, propertyId })
        }
        onBlockRange={async ({ propertyId, from, to, note }) =>
          createVendorBlockRequest({
            propertyId,
            startDate: from,
            endDate: to,
            reason: note,
          })
        }
      />
    </PortalShell>
  );
}
