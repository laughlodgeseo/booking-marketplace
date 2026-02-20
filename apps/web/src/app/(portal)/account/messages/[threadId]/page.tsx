"use client";

import { useParams } from "next/navigation";
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

export default function AccountMessageThreadPage() {
  const params = useParams<{ threadId: string }>();
  const threadId = typeof params?.threadId === "string" ? params.threadId : null;
  const tPortal = useTranslations("portal");

  return (
    <PortalMessagesView
      role="customer"
      title={tPortal("messages.pageTitle")}
      subtitle={tPortal("messages.threadSubtitle")}
      listThreads={listUserMessageThreads}
      getThread={getUserMessageThread}
      sendMessage={sendUserMessage}
      createThread={createUserMessageThread}
      selectedThreadId={threadId}
      threadHref={(id) => `/account/messages/${encodeURIComponent(id)}`}
    />
  );
}
