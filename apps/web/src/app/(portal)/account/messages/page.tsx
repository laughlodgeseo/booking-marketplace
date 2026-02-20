"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { PortalLoadingCard } from "@/components/portal/ui/PortalLoadingCard";
import {
  createUserMessageThread,
  getUserMessageThread,
  listUserMessageThreads,
  sendUserMessage,
} from "@/lib/api/portal/messaging";

const PortalMessagesView = dynamic(
  () => import("@/components/portal/messages/PortalMessagesView"),
  {
    ssr: false,
    loading: () => <PortalLoadingCard kind="messages" />,
  },
);

export default function AccountMessagesPage() {
  const tPortal = useTranslations("portal");

  return (
    <PortalMessagesView
      role="customer"
      title={tPortal("messages.pageTitle")}
      subtitle={tPortal("messages.customerSubtitle")}
      listThreads={listUserMessageThreads}
      getThread={getUserMessageThread}
      sendMessage={sendUserMessage}
      createThread={createUserMessageThread}
      threadHref={(threadId) => `/account/messages/${encodeURIComponent(threadId)}`}
    />
  );
}
