"use client";

import { useParams } from "next/navigation";
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

export default function AdminMessageThreadPage() {
  const params = useParams<{ threadId: string }>();
  const threadId = typeof params?.threadId === "string" ? params.threadId : null;
  const tPortal = useTranslations("portal");

  return (
    <PortalMessagesView
      role="admin"
      title={tPortal("messages.pageTitle")}
      subtitle={tPortal("messages.threadSubtitle")}
      listThreads={listAdminMessageThreads}
      getThread={getAdminMessageThread}
      sendMessage={sendAdminMessage}
      selectedThreadId={threadId}
      threadHref={(id) => `/admin/messages/${encodeURIComponent(id)}`}
    />
  );
}
