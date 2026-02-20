"use client";

import dynamic from "next/dynamic";
import { PortalLoadingCard } from "@/components/portal/ui/PortalLoadingCard";

const PortalNotificationsView = dynamic(
  () => import("@/components/portal/notifications/PortalNotificationsView").then((mod) => mod.PortalNotificationsView),
  {
    ssr: false,
    loading: () => <PortalLoadingCard kind="notifications" />,
  },
);

export default function VendorNotificationsPage() {
  return <PortalNotificationsView role="vendor" />;
}
