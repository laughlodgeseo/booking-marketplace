"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, MessageCircle, Send, Wifi, WifiOff } from "lucide-react";
import { PortalShell, type PortalRole } from "@/components/portal/PortalShell";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { useMessagingSocket } from "@/lib/hooks/useMessagingSocket";
import type {
  MessageThreadDetail,
  MessageThreadListResponse,
  MessageTopic,
  MessageThreadSummary,
} from "@/lib/api/portal/messaging";

type Props = {
  role: PortalRole;
  title: string;
  subtitle: string;
  listThreads: (params?: {
    page?: number;
    pageSize?: number;
    unreadOnly?: boolean;
    topic?: MessageTopic;
  }) => Promise<MessageThreadListResponse>;
  getThread: (threadId: string) => Promise<MessageThreadDetail>;
  sendMessage: (threadId: string, body: string) => Promise<{ ok: true }>;
  createThread?: (input: { subject?: string; topic?: MessageTopic; body: string }) => Promise<MessageThreadDetail>;
  selectedThreadId?: string | null;
  threadHref?: (threadId: string) => string;
};

type ThreadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; thread: MessageThreadDetail };

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function avatarText(name: string | null | undefined, email: string | null | undefined): string {
  const src = name?.trim() || email?.trim() || "?";
  const parts = src.split(/[\s._@-]+/g).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function PortalMessagesView(props: Props) {
  const router = useRouter();
  const tPortal = useTranslations("portal");
  const routeMode = typeof props.threadHref === "function";

  const topicOptions = useMemo<Array<{ value: MessageTopic; label: string }>>(
    () => [
      { value: "BOOKING_ISSUE", label: tPortal("messages.topics.bookingIssue") },
      { value: "CHECKIN_ACCESS", label: tPortal("messages.topics.checkinAccess") },
      { value: "CLEANING", label: tPortal("messages.topics.cleaning") },
      { value: "MAINTENANCE", label: tPortal("messages.topics.maintenance") },
      { value: "PAYMENT_REFUND", label: tPortal("messages.topics.paymentRefund") },
      { value: "OTHER", label: tPortal("messages.topics.other") },
    ],
    [tPortal],
  );

  function topicLabel(topic: MessageTopic): string {
    return topicOptions.find((item) => item.value === topic)?.label ?? topic;
  }

  const [threadsState, setThreadsState] = useState<
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ready"; items: MessageThreadSummary[] }
  >({ kind: "loading" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [threadState, setThreadState] = useState<ThreadState>({ kind: "idle" });
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [topicFilter, setTopicFilter] = useState<"ALL" | MessageTopic>("ALL");
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [newTopic, setNewTopic] = useState<MessageTopic>("BOOKING_ISSUE");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  /* Mobile: show thread detail panel instead of thread list */
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadThreadsRef = useRef<(() => Promise<void>) | null>(null);

  const { status: wsStatus, sendTyping } = useMessagingSocket({
    threadId: selectedId,
    onNewMessage: useCallback((msg: { id: string; body: string; createdAt: string; senderId: string; sender: { id: string; email: string; fullName: string | null; role: "ADMIN" | "VENDOR" | "CUSTOMER" } }) => {
      setThreadState((prev) => {
        if (prev.kind !== "ready") return prev;
        if (prev.thread.messages.some((m) => m.id === msg.id)) return prev;
        return {
          ...prev,
          thread: { ...prev.thread, messages: [...prev.thread.messages, msg] },
        };
      });
      void loadThreadsRef.current?.();
    }, []),
    onTyping: useCallback((data: { threadId: string; userId: string }) => {
      setTypingUser(data.userId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
    }, []),
  });

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const messageCount = threadState.kind === "ready" ? threadState.thread.messages.length : 0;
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageCount]);

  async function loadThreads() {
    setThreadsState({ kind: "loading" });
    try {
      const data = await props.listThreads({
        page: 1,
        pageSize: 40,
        unreadOnly,
        topic: topicFilter === "ALL" ? undefined : topicFilter,
      });
      const items = data.items ?? [];
      setThreadsState({ kind: "ready", items });
      if (routeMode) {
        setSelectedId(props.selectedThreadId ?? null);
      } else if (items.length > 0 && !selectedId) {
        setSelectedId(items[0].id);
      }
      if (items.length === 0) {
        setSelectedId(null);
        setThreadState({ kind: "idle" });
      }
    } catch (e) {
      setThreadsState({
        kind: "error",
        message: e instanceof Error ? e.message : tPortal("messages.errors.loadInbox"),
      });
    }
  }

  loadThreadsRef.current = loadThreads;

  useEffect(() => {
    void loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadOnly, topicFilter]);

  useEffect(() => {
    if (!routeMode) return;
    if (props.selectedThreadId) {
      setSelectedId(props.selectedThreadId);
      return;
    }
    setSelectedId(null);
    setThreadState({ kind: "idle" });
  }, [props.selectedThreadId, routeMode]);

  useEffect(() => {
    let alive = true;
    async function loadThread() {
      if (!selectedId) {
        setThreadState({ kind: "idle" });
        return;
      }
      setThreadState({ kind: "loading" });
      try {
        const thread = await props.getThread(selectedId);
        if (!alive) return;
        setThreadState({ kind: "ready", thread });
      } catch (e) {
        if (!alive) return;
        setThreadState({
          kind: "error",
          message: e instanceof Error ? e.message : tPortal("messages.errors.loadThread"),
        });
      }
    }
    void loadThread();
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props, selectedId]);

  const threadItems = useMemo(() => {
    if (threadsState.kind !== "ready") return [];
    return threadsState.items;
  }, [threadsState]);

  const viewerRole: "ADMIN" | "VENDOR" | "CUSTOMER" =
    props.role === "admin" ? "ADMIN" : props.role === "vendor" ? "VENDOR" : "CUSTOMER";

  async function submitReply() {
    if (!selectedId || !replyBody.trim()) return;
    setBusyLabel(tPortal("messages.busy.sending"));
    setSendError(null);
    try {
      await props.sendMessage(selectedId, replyBody.trim());
      setReplyBody("");
      await loadThreads();
      const refreshed = await props.getThread(selectedId);
      setThreadState({ kind: "ready", thread: refreshed });
    } catch (e) {
      setSendError(e instanceof Error ? e.message : tPortal("messages.errors.sendMessage"));
    } finally {
      setBusyLabel(null);
    }
  }

  async function createThread() {
    if (!props.createThread) return;
    if (!newBody.trim()) return;
    setBusyLabel(tPortal("messages.busy.creatingThread"));
    try {
      const thread = await props.createThread({
        subject: newSubject.trim() || undefined,
        topic: newTopic,
        body: newBody.trim(),
      });
      setNewBody("");
      setNewSubject("");
      setShowComposer(false);
      await loadThreads();
      if (props.threadHref) {
        router.push(props.threadHref(thread.id));
      } else {
        setSelectedId(thread.id);
        setMobileShowThread(true);
      }
    } catch (e) {
      setThreadsState({
        kind: "error",
        message: e instanceof Error ? e.message : tPortal("messages.errors.createThread"),
      });
    } finally {
      setBusyLabel(null);
    }
  }

  /* Open a thread — on mobile switches to thread panel */
  function openThread(threadId: string) {
    if (props.threadHref) {
      router.push(props.threadHref(threadId));
      return;
    }
    setSelectedId(threadId);
    setMobileShowThread(true);
  }

  /* WS status indicator */
  function WsIndicator() {
    if (wsStatus === "connected")
      return <span className="inline-flex items-center gap-1 text-[10px] text-green-600"><Wifi className="h-3 w-3" /> Live</span>;
    if (wsStatus === "connecting")
      return <span className="inline-flex items-center gap-1 text-[10px] text-amber-500"><Wifi className="h-3 w-3 animate-pulse" /> Connecting</span>;
    return <span className="inline-flex items-center gap-1 text-[10px] text-muted"><WifiOff className="h-3 w-3" /> Offline</span>;
  }

  /* Thread list panel */
  const ThreadListPanel = (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line/30 pb-3">
        <div className="text-sm font-semibold text-primary">{tPortal("messages.inbox")}</div>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value as "ALL" | MessageTopic)}
            className="portal-select h-8 text-[11px]"
          >
            <option value="ALL">{tPortal("messages.allTopics")}</option>
            {topicOptions.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Unread
          </label>
          {props.createThread ? (
            <button
              type="button"
              onClick={() => setShowComposer(true)}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-hover transition"
            >
              + New
            </button>
          ) : null}
        </div>
      </div>

      {/* Thread list */}
      <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto">
        {threadsState.kind === "loading" ? (
          <div className="space-y-2">
            <SkeletonBlock className="h-16" />
            <SkeletonBlock className="h-16" />
            <SkeletonBlock className="h-16" />
          </div>
        ) : threadsState.kind === "error" ? (
          <div className="rounded-xl border border-danger/20 bg-danger/8 p-3 text-xs text-danger">
            {threadsState.message}
          </div>
        ) : threadItems.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-line/50 py-8 text-center">
            <MessageCircle className="h-6 w-6 text-muted/50" />
            <div className="mt-2 text-xs font-semibold text-muted">{tPortal("messages.noThreads")}</div>
          </div>
        ) : (
          threadItems.map((thread) => {
            const active = selectedId === thread.id;
            const av = avatarText(null, thread.lastMessagePreview);
            return (
              <button
                key={thread.id}
                type="button"
                onClick={() => openThread(thread.id)}
                className={cn(
                  "portal-thread-item w-full",
                  active ? "portal-thread-item-active" : "",
                )}
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  {/* Avatar */}
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold",
                    active ? "bg-brand text-white" : "bg-neutral-200 text-muted",
                  )}>
                    {av}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-start justify-between gap-1">
                      <div className="truncate text-[13px] font-semibold text-primary">
                        {thread.subject || tPortal("messages.generalSupport")}
                      </div>
                      <div className="shrink-0 text-[10px] text-muted">
                        {thread.lastMessageAt ? relativeTime(thread.lastMessageAt) : ""}
                      </div>
                    </div>

                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted">
                        {topicLabel(thread.topic)}
                      </span>
                    </div>

                    <div className="mt-1 flex min-w-0 items-center justify-between gap-1">
                      <div className="truncate text-[11px] text-muted">
                        {thread.lastMessagePreview || tPortal("messages.noMessages")}
                      </div>
                      {thread.unreadCount > 0 ? (
                        <span className="shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {thread.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  /* Thread detail panel */
  const ThreadDetailPanel = (
    <div className="flex h-full flex-col">
      {threadState.kind === "idle" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="text-sm font-semibold text-primary">Select a conversation</div>
          <div className="max-w-xs text-xs text-muted">{tPortal("messages.selectThread")}</div>
        </div>
      ) : threadState.kind === "loading" ? (
        <div className="space-y-3 p-2">
          <SkeletonBlock className="h-12" />
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
        </div>
      ) : threadState.kind === "error" ? (
        <div className="rounded-xl border border-danger/20 bg-danger/8 p-3 text-xs text-danger">
          {threadState.message}
        </div>
      ) : (
        <>
          {/* Thread header */}
          <div className="shrink-0 border-b border-line/30 pb-3">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-primary">
                  {threadState.thread.subject || tPortal("messages.generalSupport")}
                </div>
                <div className="mt-0.5 text-[11px] text-secondary">
                  {tPortal("messages.threadWith")}{" "}
                  {props.role === "admin"
                    ? threadState.thread.counterpartyUser.fullName || threadState.thread.counterpartyUser.email
                    : threadState.thread.admin.fullName || threadState.thread.admin.email}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-muted">
                    {topicLabel(threadState.thread.topic)}
                  </span>
                  <StatusPill status={threadState.thread.counterpartyRole}>
                    {threadState.thread.counterpartyRole}
                  </StatusPill>
                  <WsIndicator />
                </div>
              </div>

              {/* Mobile back button */}
              <button
                type="button"
                className="shrink-0 lg:hidden"
                onClick={() => setMobileShowThread(false)}
              >
                <ArrowLeft className="h-5 w-5 text-muted" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="mt-3 flex-1 space-y-2 overflow-y-auto rounded-xl border border-line/30 bg-neutral-50/60 p-3">
            {threadState.thread.messages.map((message) => {
              const mine = message.sender.role === viewerRole;
              return (
                <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  {!mine ? (
                    <div className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center self-end rounded-xl bg-neutral-200 text-[10px] font-bold text-muted">
                      {avatarText(message.sender.fullName, message.sender.email)}
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm",
                      mine
                        ? "rounded-br-sm bg-brand text-white"
                        : "rounded-bl-sm bg-white text-primary shadow-sm ring-1 ring-line/30",
                    )}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">{message.body}</div>
                    <div className={cn("mt-1 text-[10px]", mine ? "text-white/60" : "text-muted")}>
                      {relativeTime(message.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {typingUser ? (
            <div className="mt-1 text-[11px] text-secondary animate-pulse">
              {tPortal("messages.typingIndicator") || "Someone is typing…"}
            </div>
          ) : null}

          {/* Reply composer */}
          <div className="mt-3 shrink-0 space-y-2">
            {sendError ? (
              <div className="flex items-center justify-between rounded-xl border border-danger/20 bg-danger/8 px-3 py-2 text-xs text-danger">
                <span>{sendError}</span>
                <button type="button" onClick={() => setSendError(null)} className="font-semibold hover:underline">
                  Dismiss
                </button>
              </div>
            ) : null}

            <div className="flex items-end gap-2">
              <textarea
                value={replyBody}
                onChange={(e) => {
                  setReplyBody(e.target.value);
                  sendTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void submitReply();
                  }
                }}
                rows={2}
                placeholder={tPortal("messages.writeReply")}
                className="flex-1 resize-none rounded-xl border border-line/40 bg-white px-3 py-2 text-sm text-primary outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/12 transition-all"
              />
              <button
                type="button"
                disabled={!replyBody.trim() || busyLabel !== null}
                onClick={() => void submitReply()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white hover:bg-brand-hover disabled:opacity-50 transition"
                title={tPortal("messages.sendReply")}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  /* New thread composer panel */
  const ComposerPanel = showComposer ? (
    <div className="mb-4 rounded-2xl border border-line/40 bg-surface/90 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-primary">{tPortal("messages.startNew")}</div>
        <button
          type="button"
          onClick={() => setShowComposer(false)}
          className="text-xs text-muted hover:text-primary"
        >
          Cancel
        </button>
      </div>
      <div className="grid gap-2.5">
        <select
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value as MessageTopic)}
          className="portal-select h-10 text-sm"
        >
          {topicOptions.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input
          value={newSubject}
          onChange={(e) => setNewSubject(e.target.value)}
          placeholder={tPortal("messages.subjectOptional")}
          className="h-10 rounded-xl border border-line/40 bg-neutral-50 px-3 text-sm text-primary outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/12 transition-all"
        />
        <textarea
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          rows={3}
          placeholder={tPortal("messages.writeMessage")}
          className="resize-none rounded-xl border border-line/40 bg-neutral-50 px-3 py-2 text-sm text-primary outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/12 transition-all"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted">{tPortal("messages.privateHint")}</span>
          <button
            type="button"
            disabled={!newBody.trim() || busyLabel !== null}
            onClick={() => void createThread()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60 transition"
          >
            <Send className="h-3.5 w-3.5" />
            {tPortal("messages.startThread")}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <PortalShell role={props.role} title={props.title} subtitle={props.subtitle}>
      <div className="space-y-4">
        {ComposerPanel}

        {/* Main messages layout */}
        <div className="overflow-hidden rounded-2xl border border-line/30 bg-surface/90">
          {/* Desktop: side-by-side */}
          <div className="hidden lg:grid lg:grid-cols-[320px_1fr] lg:divide-x lg:divide-line/20">
            <div className="min-h-[560px] overflow-y-auto p-4">{ThreadListPanel}</div>
            <div className="min-h-[560px] p-4">{ThreadDetailPanel}</div>
          </div>

          {/* Mobile: either thread list or thread detail */}
          <div className="lg:hidden">
            {!mobileShowThread ? (
              <div className="min-h-[400px] p-4">{ThreadListPanel}</div>
            ) : (
              <div className="min-h-[400px] p-4">{ThreadDetailPanel}</div>
            )}
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
