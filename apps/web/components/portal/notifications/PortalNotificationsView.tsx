"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { PortalShell } from "@/components/portal/PortalShell";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import {
  listPortalNotifications,
  markAllPortalNotificationsRead,
  markPortalNotificationRead,
  type PortalNotificationItem,
  type PortalNotificationRole,
} from "@/lib/api/portal/notifications";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; items: PortalNotificationItem[]; page: number; pageSize: number; total: number };

function fmtDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale);
}

function statusLabel(item: PortalNotificationItem, tPortal: ReturnType<typeof useTranslations>): string {
  if (!item.readAt) return tPortal("notifications.status.unread");
  return tPortal("notifications.status.read");
}

function itemMessage(item: PortalNotificationItem, tPortal: ReturnType<typeof useTranslations>): string {
  if (item.type === "PROPERTY_APPROVED_ACTIVATION_REQUIRED") {
    return tPortal("notifications.messages.propertyApprovedActivationRequired");
  }
  if (item.type === "DOCUMENT_UPLOAD_REQUEST") {
    return tPortal("notifications.messages.documentUploadRequest");
  }
  if (item.type === "BOOKING_CONFIRMED") {
    return tPortal("notifications.messages.bookingConfirmed");
  }
  if (item.type === "BOOKING_CANCELLED" || item.type === "BOOKING_CANCELLED_BY_GUEST") {
    return tPortal("notifications.messages.bookingCancelled");
  }
  if (item.type === "PAYMENT_PENDING") {
    return tPortal("notifications.messages.paymentPending");
  }
  if (item.type === "PAYMENT_FAILED") {
    return tPortal("notifications.messages.paymentFailed");
  }
  if (item.type === "REFUND_PROCESSED") {
    return tPortal("notifications.messages.refundProcessed");
  }
  if (item.type === "OPS_TASKS_CREATED") {
    return tPortal("notifications.messages.opsTasksCreated");
  }

  const payloadMessage = typeof item.payload.message === "string" ? item.payload.message.trim() : "";
  if (payloadMessage) return payloadMessage;

  return tPortal("notifications.messages.entityUpdate", { entityType: item.entityType });
}

function actionHref(role: PortalNotificationRole, item: PortalNotificationItem): string | null {
  const payloadActionUrl = typeof item.payload.actionUrl === "string" ? item.payload.actionUrl.trim() : "";
  if (payloadActionUrl) return payloadActionUrl;

  if (item.entityType === "booking") {
    if (role === "admin") return `/admin/bookings/${encodeURIComponent(item.entityId)}`;
    if (role === "vendor") return `/vendor/bookings/${encodeURIComponent(item.entityId)}`;
    return `/account/bookings/${encodeURIComponent(item.entityId)}`;
  }

  if (item.entityType === "property") {
    if (role === "admin") return `/admin/properties/${encodeURIComponent(item.entityId)}`;
    if (role === "vendor") return `/vendor/properties/${encodeURIComponent(item.entityId)}/edit`;
    return null;
  }

  if (item.entityType === "payment" && role === "admin") {
    return `/admin/payments/${encodeURIComponent(item.entityId)}`;
  }

  if (item.entityType === "refund" && role === "admin") {
    return `/admin/refunds/${encodeURIComponent(item.entityId)}`;
  }

  return null;
}

function roleMeta(role: PortalNotificationRole, tPortal: ReturnType<typeof useTranslations>) {
  if (role === "admin") {
    return {
      portalRole: "admin" as const,
      homeHref: "/admin",
      listHref: "/admin/notifications",
      title: tPortal("notifications.titleAdmin"),
    };
  }

  if (role === "vendor") {
    return {
      portalRole: "vendor" as const,
      homeHref: "/vendor",
      listHref: "/vendor/notifications",
      title: tPortal("notifications.titleVendor"),
    };
  }

  return {
    portalRole: "customer" as const,
    homeHref: "/account",
    listHref: "/account/notifications",
    title: tPortal("notifications.titleCustomer"),
  };
}

export function PortalNotificationsView(props: { role: PortalNotificationRole }) {
  const tPortal = useTranslations("portal");
  const locale = useLocale();
  const meta = useMemo(() => roleMeta(props.role, tPortal), [props.role, tPortal]);

  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const data = await listPortalNotifications(props.role, {
        page,
        pageSize,
        unreadOnly,
      });
      setState({
        kind: "ready",
        items: data.items,
        page: data.page,
        pageSize: data.pageSize,
        total: data.total,
      });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : tPortal("notifications.errors.load"),
      });
    }
  }, [page, pageSize, props.role, tPortal, unreadOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(item: PortalNotificationItem) {
    if (item.readAt) return;
    setBusy(tPortal("notifications.busy.markingRead"));
    try {
      await markPortalNotificationRead(props.role, item.id);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function markAllRead() {
    setBusy(tPortal("notifications.busy.markingAllRead"));
    try {
      await markAllPortalNotificationsRead(props.role);
      await load();
    } finally {
      setBusy(null);
    }
  }

  const canPrev = state.kind === "ready" ? state.page > 1 : false;
  const canNext = state.kind === "ready" ? state.page * state.pageSize < state.total : false;

  return (
    <PortalShell
      role={meta.portalRole}
      title={meta.title}
      subtitle={tPortal("notifications.subtitle")}
      right={
        <Link
          href={meta.homeHref}
          className="rounded-2xl border border-line/80 bg-surface px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-warm-alt"
        >
          {tPortal("notifications.backToPortal")}
        </Link>
      }
    >
      <div className="space-y-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">
          <Link href={meta.homeHref} className="hover:text-primary">{tPortal("notifications.portalHome")}</Link>
          <span className="mx-2">/</span>
          <span className="text-primary">{tPortal("notifications.breadcrumbCurrent")}</span>
        </div>

        <section className="rounded-3xl border border-line/70 bg-surface p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <Bell className="h-4 w-4 text-secondary" />
              {tPortal("notifications.inbox")}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 rounded-xl border border-line/80 bg-warm-base px-3 py-2 text-xs font-semibold text-primary">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(event) => {
                    setUnreadOnly(event.target.checked);
                    setPage(1);
                  }}
                />
                {tPortal("notifications.unreadOnly")}
              </label>
              <button
                type="button"
                onClick={() => void markAllRead()}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt disabled:opacity-60"
              >
                <CheckCheck className="h-4 w-4" />
                {tPortal("notifications.markAllRead")}
              </button>
            </div>
          </div>
          {busy ? <div className="mt-3 text-xs font-semibold text-secondary">{busy}</div> : null}
        </section>

        {state.kind === "loading" ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
          </div>
        ) : state.kind === "error" ? (
          <div className="rounded-3xl border border-danger/30 bg-danger/12 p-5 text-sm text-danger">{state.message}</div>
        ) : state.items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line/70 bg-warm-base p-6 text-sm text-secondary">
            {tPortal("notifications.noneFound")}
          </div>
        ) : (
          <div className="space-y-3">
            {state.items.map((item) => {
              const href = actionHref(props.role, item);
              return (
                <article key={item.id} className="rounded-3xl border border-line/70 bg-surface p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-primary">{itemMessage(item, tPortal)}</div>
                      <div className="mt-1 text-xs text-secondary">
                        {fmtDate(item.createdAt, locale)} · {item.type}
                      </div>
                    </div>
                    <StatusPill status={statusLabel(item, tPortal)}>{statusLabel(item, tPortal)}</StatusPill>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {!item.readAt ? (
                      <button
                        type="button"
                        onClick={() => void markRead(item)}
                        className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt"
                      >
                        {tPortal("notifications.markRead")}
                      </button>
                    ) : null}
                    {href ? (
                      <Link
                        href={href}
                        className="inline-flex items-center gap-1 rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt"
                      >
                        {tPortal("notifications.open")}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={!canPrev}
                className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt disabled:opacity-60"
              >
                {tPortal("notifications.prev")}
              </button>
              <div className="text-xs text-secondary">
                {tPortal("notifications.pageLabel", { page: state.page })}
                {state.total ? ` · ${tPortal("notifications.totalLabel", { total: state.total })}` : ""}
              </div>
              <button
                type="button"
                onClick={() => setPage((value) => value + 1)}
                disabled={!canNext}
                className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt disabled:opacity-60"
              >
                {tPortal("notifications.next")}
              </button>
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
