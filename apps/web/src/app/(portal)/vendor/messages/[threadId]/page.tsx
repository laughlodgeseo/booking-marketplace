"use client";

import { useParams } from "next/navigation";
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

export default function VendorMessageThreadPage() {
  const params = useParams<{ threadId: string }>();
  const threadId = typeof params?.threadId === "string" ? params.threadId : null;
  const tPortal = useTranslations("portal");

  return (
    <PortalMessagesView
      role="vendor"
      title={tPortal("messages.pageTitle")}
      subtitle={tPortal("messages.threadSubtitle")}
      listThreads={listVendorMessageThreads}
      getThread={getVendorMessageThread}
      sendMessage={sendVendorMessage}
      createThread={createVendorMessageThread}
      selectedThreadId={threadId}
      threadHref={(id) => `/vendor/messages/${encodeURIComponent(id)}`}
    />
  );
}
