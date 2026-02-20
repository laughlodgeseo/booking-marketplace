"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalLoadingCard } from "@/components/portal/ui/PortalLoadingCard";
import { getUserCalendar } from "@/lib/api/portal/user";

const PortalAvailabilityCalendar = dynamic(
  () => import("@/components/portal/calendar/PortalAvailabilityCalendar").then((mod) => mod.PortalAvailabilityCalendar),
  {
    ssr: false,
    loading: () => <PortalLoadingCard kind="calendar" />,
  },
);

export default function AccountCalendarPage() {
  const tPortal = useTranslations("portal");

  return (
    <PortalShell
      role="customer"
      title={tPortal("calendar.pageTitle")}
      subtitle={tPortal("calendar.customerSubtitle")}
    >
      <PortalAvailabilityCalendar
        role="customer"
        loadData={async ({ from, to, propertyId }) =>
          getUserCalendar({ from, to, propertyId })
        }
        eventHref={(event) =>
          event.type === "BOOKING"
            ? `/account/bookings/${encodeURIComponent(event.id)}`
            : null
        }
      />
    </PortalShell>
  );
}
