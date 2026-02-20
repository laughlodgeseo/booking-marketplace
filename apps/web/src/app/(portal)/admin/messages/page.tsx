"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { PortalLoadingCard } from "@/components/portal/ui/PortalLoadingCard";
import {
  getAdminMessageThread,
  listAdminMessageThreads,
  sendAdminMessage,
} from "@/lib/api/portal/messaging";

const PortalMessagesView = dynamic(
  () => import("@/components/portal/messages/PortalMessagesView"),
  {
    ssr: false,
    loading: () => <PortalLoadingCard kind="messages" />,
  },
);

export default function AdminMessagesPage() {
  const tPortal = useTranslations("portal");

  return (
    <PortalMessagesView
      role="admin"
      title={tPortal("messages.pageTitle")}
      subtitle={tPortal("messages.adminSubtitle")}
      listThreads={listAdminMessageThreads}
      getThread={getAdminMessageThread}
      sendMessage={sendAdminMessage}
      threadHref={(threadId) => `/admin/messages/${encodeURIComponent(threadId)}`}
    />
  );
}
