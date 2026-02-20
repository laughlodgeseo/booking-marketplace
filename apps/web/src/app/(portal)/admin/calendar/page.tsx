"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalLoadingCard } from "@/components/portal/ui/PortalLoadingCard";
import { getAdminCalendar } from "@/lib/api/portal/admin";

const PortalAvailabilityCalendar = dynamic(
  () => import("@/components/portal/calendar/PortalAvailabilityCalendar").then((mod) => mod.PortalAvailabilityCalendar),
  {
    ssr: false,
    loading: () => <PortalLoadingCard kind="calendar" />,
  },
);

export default function AdminCalendarPage() {
  const tPortal = useTranslations("portal");

  return (
    <PortalShell
      role="admin"
      title={tPortal("calendar.pageTitle")}
      subtitle={tPortal("calendar.adminSubtitle")}
    >
      <PortalAvailabilityCalendar
        role="admin"
        loadData={async ({ from, to, propertyId }) =>
          getAdminCalendar({ from, to, propertyId })
        }
      />
    </PortalShell>
  );
}
