"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, Check, CheckCheck } from "lucide-react";
import {
  listPortalNotifications,
  markPortalNotificationRead,
  markAllPortalNotificationsRead,
  getPortalUnreadCount,
} from "@/lib/api/portal/notifications";
import { getAccessToken } from "@/lib/auth/tokenStore";
import { apiBaseUrl } from "@/lib/api/base";

/* ------------------------------------------------------------------ */
/*  Types & helpers                                                    */
/* ------------------------------------------------------------------ */

type NotificationDisplay = {
  id: string;
  type: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  readAt: string | null;
};

type NotificationBellProps = {
  role: "customer" | "vendor" | "admin";
  notificationsHref: string;
  initialUnreadCount?: number;
};

const typeLabels: Record<string, string> = {
  BOOKING_CONFIRMED: "Booking Confirmed",
  BOOKING_CANCELLED: "Booking Cancelled",
  BOOKING_CANCELLED_BY_GUEST: "Booking Cancelled",
  PAYMENT_PENDING: "Payment Pending",
  PAYMENT_FAILED: "Payment Failed",
  REFUND_PROCESSED: "Refund Processed",
  PROPERTY_APPROVED_ACTIVATION_REQUIRED: "Property Approved",
  DOCUMENT_UPLOAD_REQUEST: "Document Request",
  NEW_BOOKING_RECEIVED: "New Booking",
  OPS_TASKS_CREATED: "New Ops Task",
  EMAIL_VERIFICATION_OTP: "Verification",
};

function labelForType(type: string): string {
  return typeLabels[type] ?? type.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function NotificationBell({
  role,
  notificationsHref,
  initialUnreadCount = 0,
}: NotificationBellProps) {
  const router = useRouter();
  const t = useTranslations("portal.notificationBell");

  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [notifications, setNotifications] = useState<NotificationDisplay[]>([]);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  function relativeTime(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffSec = Math.floor((now - then) / 1000);
    if (diffSec < 60) return t("justNow");
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return t("minAgo", { min: diffMin });
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return t("hrAgo", { hr: diffHr });
    const diffDay = Math.floor(diffHr / 24);
    return t("dayAgo", { day: diffDay });
  }

  /* ---------- click outside ---------- */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---------- fetch latest when opened ---------- */
  const fetchLatest = useCallback(async () => {
    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        listPortalNotifications(role, { page: 1, pageSize: 5, unreadOnly: true }),
        getPortalUnreadCount(role),
      ]);
      setNotifications(list.items.map((n) => ({
        id: n.id,
        type: n.type,
        entityType: n.entityType,
        entityId: n.entityId,
        createdAt: n.createdAt,
        readAt: n.readAt,
      })));
      setUnreadCount(count.unreadCount);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (open) {
      fetchLatest();
    }
  }, [open, fetchLatest]);

  /* ---------- SSE real-time connection ---------- */
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const base = apiBaseUrl();
    const url = `${base}/notifications/stream`;

    const es = new EventSource(`${url}?token=${encodeURIComponent(token)}`);

    es.addEventListener("notification", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (typeof data.unreadCount === "number") {
          setUnreadCount(data.unreadCount);
        }
        if (Array.isArray(data.latest) && data.latest.length > 0) {
          type RawItem = { id: string; type: string; entityType?: string; entityId?: string; createdAt: string };
          setNotifications((prev) => {
            const merged: NotificationDisplay[] = (data.latest as RawItem[]).map((n) => ({
              id: n.id,
              type: n.type,
              entityType: n.entityType ?? "",
              entityId: n.entityId ?? "",
              createdAt: n.createdAt,
              readAt: null,
            }));
            const ids = new Set(merged.map((n) => n.id));
            for (const n of prev) {
              if (!ids.has(n.id) && merged.length < 5) merged.push(n);
            }
            return merged.slice(0, 5);
          });
        }
      } catch {
        // ignore parse errors
      }
    });

    es.onerror = () => {
      // EventSource will auto-reconnect
    };

    return () => {
      es.close();
    };
  }, []);

  /* ---------- actions ---------- */
  const handleMarkRead = useCallback(
    async (id: string) => {
      try {
        await markPortalNotificationRead(role, id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // ignore
      }
    },
    [role],
  );

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllPortalNotificationsRead(role);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
      );
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }, [role]);

  const handleNotificationClick = useCallback(
    async (notification: NotificationDisplay) => {
      if (!notification.readAt) {
        handleMarkRead(notification.id);
      }
      setOpen(false);
      router.push(notificationsHref);
    },
    [handleMarkRead, notificationsHref, router],
  );

  /* ---------- render ---------- */
  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,236,255,0.84))] px-4 text-sm font-semibold text-primary ring-1 ring-brand/20 shadow-[0_8px_20px_rgba(79,70,229,0.12)] transition-transform hover:translate-y-[-1px] hover:bg-accent-soft/24 active:translate-y-0"
        aria-label={t("aria")}
      >
        <Bell className="h-4 w-4 text-secondary" />
        <span className="hidden xl:inline">{t("alerts")}</span>
        {unreadCount > 0 && (
          <span className="rounded-full bg-danger px-2 py-0.5 text-[11px] font-bold text-inverted">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[360px] overflow-hidden rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,239,255,0.95))] shadow-[0_24px_64px_rgba(79,70,229,0.22)] ring-1 ring-brand/18">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="text-sm font-semibold text-primary">{t("notifications")}</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-hover transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {t("markAllRead")}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[340px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted">
                {t("loading")}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted">
                {t("noNew")}
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.readAt;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleNotificationClick(n)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent-soft/18 ${
                      isUnread ? "border-l-2 border-l-brand" : "border-l-2 border-l-transparent"
                    }`}
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand/10">
                      <Check className="h-4 w-4 text-brand" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-sm ${
                          isUnread ? "font-semibold text-primary" : "font-medium text-secondary"
                        }`}
                      >
                        {labelForType(n.type)}
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        {n.entityType && (
                          <span className="capitalize">{n.entityType.toLowerCase()}</span>
                        )}
                        {n.entityType && " \u00b7 "}
                        {relativeTime(n.createdAt)}
                      </div>
                    </div>
                    {isUnread && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5">
            <Link
              href={notificationsHref}
              onClick={() => setOpen(false)}
              className="block w-full text-center text-xs font-semibold text-brand hover:text-brand-hover transition-colors"
            >
              {t("viewAll")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
