"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { PortalLoadingCard } from "@/components/portal/ui/PortalLoadingCard";
import {
  createVendorMessageThread,
  getVendorMessageThread,
  listVendorMessageThreads,
  sendVendorMessage,
} from "@/lib/api/portal/messaging";

const PortalMessagesView = dynamic(
  () => import("@/components/portal/messages/PortalMessagesView"),
  {
    ssr: false,
    loading: () => <PortalLoadingCard kind="messages" />,
  },
);

export default function VendorMessagesPage() {
  const tPortal = useTranslations("portal");

  return (
    <PortalMessagesView
      role="vendor"
      title={tPortal("messages.pageTitle")}
      subtitle={tPortal("messages.vendorSubtitle")}
      listThreads={listVendorMessageThreads}
      getThread={getVendorMessageThread}
      sendMessage={sendVendorMessage}
      createThread={createVendorMessageThread}
      threadHref={(threadId) => `/vendor/messages/${encodeURIComponent(threadId)}`}
    />
  );
}
