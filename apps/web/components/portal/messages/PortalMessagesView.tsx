"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PortalShell, type PortalRole } from "@/components/portal/PortalShell";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { StatusPill } from "@/components/portal/ui/StatusPill";
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
    const selected = topicOptions.find((item) => item.value === topic);
    return selected ? selected.label : topic;
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
        if (props.selectedThreadId) {
          setSelectedId(props.selectedThreadId);
        } else {
          setSelectedId(null);
        }
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
    return () => {
      alive = false;
    };
  }, [props, selectedId]);

  const threadItems = useMemo(() => {
    if (threadsState.kind !== "ready") return [];
    return threadsState.items;
  }, [threadsState]);

  const viewerRole: "ADMIN" | "VENDOR" | "CUSTOMER" =
    props.role === "admin"
      ? "ADMIN"
      : props.role === "vendor"
        ? "VENDOR"
        : "CUSTOMER";

  async function submitReply() {
    if (!selectedId || !replyBody.trim()) return;
    setBusyLabel(tPortal("messages.busy.sending"));
    try {
      await props.sendMessage(selectedId, replyBody.trim());
      setReplyBody("");
      await loadThreads();
      const refreshed = await props.getThread(selectedId);
      setThreadState({ kind: "ready", thread: refreshed });
    } catch (e) {
      setThreadState({
        kind: "error",
        message: e instanceof Error ? e.message : tPortal("messages.errors.sendMessage"),
      });
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
      await loadThreads();
      if (props.threadHref) {
        router.push(props.threadHref(thread.id));
      } else {
        setSelectedId(thread.id);
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

  return (
    <PortalShell role={props.role} title={props.title} subtitle={props.subtitle}>
      <div className="space-y-5">
        {props.createThread ? (
          <section className="rounded-3xl border border-line/50 bg-surface p-4 shadow-sm">
            <div className="text-sm font-semibold text-primary">{tPortal("messages.startNew")}</div>
            <div className="mt-3 grid gap-3">
              <select
                value={newTopic}
                onChange={(event) => setNewTopic(event.target.value as MessageTopic)}
                className="h-10 rounded-xl border border-line/80 bg-surface px-3 text-sm text-primary"
              >
                {topicOptions.map((topic) => (
                  <option key={topic.value} value={topic.value}>
                    {topic.label}
                  </option>
                ))}
              </select>
              <input
                value={newSubject}
                onChange={(event) => setNewSubject(event.target.value)}
                placeholder={tPortal("messages.subjectOptional")}
                className="h-10 rounded-xl border border-line/80 bg-surface px-3 text-sm text-primary"
              />
              <textarea
                value={newBody}
                onChange={(event) => setNewBody(event.target.value)}
                rows={3}
                placeholder={tPortal("messages.writeMessage")}
                className="w-full rounded-xl border border-line/80 bg-surface px-3 py-2 text-sm text-primary"
              />
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted">
                  {tPortal("messages.privateHint")}
                </div>
                <button
                  type="button"
                  disabled={!newBody.trim() || busyLabel !== null}
                  onClick={() => void createThread()}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover disabled:opacity-60"
                >
                  {tPortal("messages.startThread")}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-line/50 bg-surface p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-primary">{tPortal("messages.inbox")}</div>
            <div className="flex items-center gap-2">
              <select
                value={topicFilter}
                onChange={(event) => setTopicFilter(event.target.value as "ALL" | MessageTopic)}
                className="h-9 rounded-lg border border-line/80 bg-surface px-3 text-xs font-semibold text-primary"
              >
                <option value="ALL">{tPortal("messages.allTopics")}</option>
                {topicOptions.map((topic) => (
                  <option key={topic.value} value={topic.value}>
                    {topic.label}
                  </option>
                ))}
              </select>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-secondary">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(event) => setUnreadOnly(event.target.checked)}
                />
                {tPortal("messages.unreadOnly")}
              </label>
            </div>
          </div>

          {busyLabel ? <div className="mt-3 text-xs font-semibold text-secondary">{busyLabel}</div> : null}

          <div className="mt-4 grid gap-4 lg:grid-cols-[340px_1fr]">
            <div className="space-y-2">
              {threadsState.kind === "loading" ? (
                <div className="space-y-2">
                  <SkeletonBlock className="h-20" />
                  <SkeletonBlock className="h-20" />
                </div>
              ) : threadsState.kind === "error" ? (
                <div className="rounded-2xl border border-danger/30 bg-danger/12 p-3 text-sm text-danger">
                  {threadsState.message}
                </div>
              ) : threadItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line/80 bg-warm-alt p-4 text-sm text-secondary">
                  {tPortal("messages.noThreads")}
                </div>
              ) : (
                threadItems.map((thread) => {
                  const active = selectedId === thread.id;
                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => {
                        if (props.threadHref) {
                          router.push(props.threadHref(thread.id));
                          return;
                        }
                        setSelectedId(thread.id);
                      }}
                      className={[
                        "w-full rounded-2xl border p-3 text-left transition",
                        active
                          ? "border-brand/45 bg-accent-soft/80"
                          : "border-line/80 bg-surface hover:bg-warm-alt",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-primary">
                            {thread.subject || tPortal("messages.generalSupport")}
                          </div>
                          <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                            {topicLabel(thread.topic)}
                          </div>
                          <div className="mt-1 truncate text-xs text-secondary">
                            {thread.lastMessagePreview || tPortal("messages.noMessages")}
                          </div>
                        </div>
                        {thread.unreadCount > 0 ? (
                          <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-accent-text">
                            {thread.unreadCount}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 text-[11px] text-muted">
                        {thread.lastMessageAt
                          ? new Date(thread.lastMessageAt).toLocaleString()
                          : tPortal("messages.noActivity")}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="rounded-2xl border border-line/80 bg-warm-base p-4">
              {threadState.kind === "idle" ? (
                <div className="text-sm text-secondary">{tPortal("messages.selectThread")}</div>
              ) : threadState.kind === "loading" ? (
                <div className="space-y-2">
                  <SkeletonBlock className="h-16" />
                  <SkeletonBlock className="h-16" />
                </div>
              ) : threadState.kind === "error" ? (
                <div className="rounded-2xl border border-danger/30 bg-danger/12 p-3 text-sm text-danger">
                  {threadState.message}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-primary">
                        {threadState.thread.subject || tPortal("messages.generalSupport")}
                      </div>
                      <div className="mt-1 text-xs text-secondary">
                        {tPortal("messages.threadWith")}{" "}
                        {props.role === "admin"
                          ? threadState.thread.counterpartyUser.fullName ||
                            threadState.thread.counterpartyUser.email
                          : threadState.thread.admin.fullName || threadState.thread.admin.email}
                      </div>
                      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">
                        {topicLabel(threadState.thread.topic)}
                      </div>
                    </div>
                    <StatusPill status={threadState.thread.counterpartyRole}>
                      {threadState.thread.counterpartyRole}
                    </StatusPill>
                  </div>

                  <div className="max-h-[380px] space-y-2 overflow-auto rounded-2xl border border-line/80 bg-surface p-3">
                    {threadState.thread.messages.map((message) => {
                      const mine = message.sender.role === viewerRole;
                      return (
                        <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={[
                              "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                              mine ? "bg-brand text-accent-text" : "bg-warm-alt text-primary",
                            ].join(" ")}
                          >
                            <div className="whitespace-pre-wrap">{message.body}</div>
                            <div className={`mt-1 text-[10px] ${mine ? "text-inverted/70" : "text-muted"}`}>
                              {new Date(message.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-2">
                    <textarea
                      value={replyBody}
                      onChange={(event) => setReplyBody(event.target.value)}
                      rows={3}
                      placeholder={tPortal("messages.writeReply")}
                      className="w-full rounded-xl border border-line/80 bg-surface px-3 py-2 text-sm text-primary"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={!replyBody.trim() || busyLabel !== null}
                        onClick={() => void submitReply()}
                        className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:opacity-95 disabled:opacity-60"
                      >
                        {tPortal("messages.sendReply")}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </PortalShell>
  );
}
