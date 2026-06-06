"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogOut, Search } from "lucide-react";
import NotificationBell from "@/components/portal/layout/NotificationBell";
import { useTranslations } from "next-intl";
import type { PortalRole } from "@/components/portal/layout/portal-navigation";
import { roleLabel } from "@/components/portal/layout/portal-navigation";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";

export function initials(email: string): string {
  const value = email.trim();
  if (!value) return "U";

  const local = value.split("@")[0] ?? value;
  const parts = local.split(/[._-]+/g).filter(Boolean);
  const first = parts[0]?.[0] ?? local[0] ?? "U";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

const ROLE_BADGE: Record<string, { bg: string; text: string; dot: string }> = {
  customer: { bg: "bg-indigo-50 ring-1 ring-indigo-200/60", text: "text-indigo-700", dot: "bg-indigo-400" },
  vendor:   { bg: "bg-brand/10 ring-1 ring-brand/20",       text: "text-brand",      dot: "bg-brand" },
  admin:    { bg: "bg-slate-100 ring-1 ring-slate-200/60",   text: "text-slate-700",  dot: "bg-slate-500" },
};

export function PortalHeader(props: {
  role?: PortalRole;
  title: string;
  right?: ReactNode;
  userEmail: string | null;
  userName?: string | null;
  notificationsHref?: string;
  unreadCount?: number;
  onLogout: () => void;
}) {
  const tPortal = useTranslations("portal");
  const name = props.userName?.trim() || "";
  const displayName = name || tPortal("shell.userFallback");
  const firstName = displayName.split(/\s+/g)[0] || tPortal("shell.userFallback");
  const badge = initials(props.userEmail ?? displayName);
  const unreadCount = Math.max(0, props.unreadCount ?? 0);
  const notificationsHref = props.notificationsHref ?? "#";
  const roleName = roleLabel(props.role, (key) => tPortal(key));
  const roleBadge = ROLE_BADGE[props.role ?? "customer"] ?? ROLE_BADGE.customer;

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/96 text-primary shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-4 py-2.5 sm:gap-3 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link href="/" className="group inline-flex shrink-0 items-center gap-2">
          <span className="rounded-xl bg-white px-2 py-1 shadow-sm ring-1 ring-neutral-200/80">
            <Image
              src="/brand/logo.svg"
              alt="Laugh & Lodge"
              width={150}
              height={48}
              className="h-7 w-auto sm:h-8"
              priority
            />
          </span>
        </Link>

        {/* Role + page title — desktop only */}
        <div className="hidden min-w-0 lg:block">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${roleBadge.bg} ${roleBadge.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${roleBadge.dot}`} />
              {roleName}
            </span>
          </div>
          <div className="mt-0.5 max-w-[200px] truncate text-sm font-semibold text-primary xl:max-w-[280px]">
            {props.title}
          </div>
        </div>

        {/* Search — desktop */}
        <div className="relative hidden min-w-0 flex-1 lg:flex" style={{ maxWidth: "420px" }}>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            placeholder={tPortal("searchPlaceholder")}
            className="h-10 w-full rounded-xl bg-neutral-50 pl-9 pr-3 text-sm text-primary ring-1 ring-neutral-200/80 outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-brand/25 focus-visible:bg-white transition-all"
          />
        </div>

        {/* Desktop right controls */}
        <div className="ml-auto hidden items-center gap-2 lg:flex xl:gap-2.5">
          {props.right ? <div className="hidden shrink-0 xl:block">{props.right}</div> : null}

          <LanguageSwitcher compact />

          <NotificationBell
            role={props.role ?? "customer"}
            notificationsHref={notificationsHref}
            initialUnreadCount={unreadCount}
          />

          {/* Account chip */}
          <div className="flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-1.5 ring-1 ring-neutral-200/80">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-[11px] font-bold text-white">
              {badge}
            </div>
            <div className="hidden xl:block">
              <div className="max-w-[130px] truncate text-sm font-semibold text-primary">
                {firstName}
              </div>
              <div className="text-[11px] text-muted leading-tight">{roleName}</div>
            </div>
          </div>

          {/* Logout — subtle ghost button */}
          <button
            type="button"
            onClick={props.onLogout}
            title={tPortal("logout")}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-neutral-200/80 bg-white px-3 text-sm font-medium text-secondary hover:border-danger/30 hover:bg-danger/5 hover:text-danger transition-all"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden xl:inline">{tPortal("logout")}</span>
          </button>
        </div>

        {/* Mobile right controls — compact: notifications only (language + logout in drawer) */}
        <div className="ml-auto flex items-center gap-1.5 lg:hidden">
          {props.right ? <div className="shrink-0">{props.right}</div> : null}

          <LanguageSwitcher compact />

          <NotificationBell
            role={props.role ?? "customer"}
            notificationsHref={notificationsHref}
            initialUnreadCount={unreadCount}
          />

          {/* Mobile account avatar — tapping opens drawer (handled by PortalShell) */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-[11px] font-bold text-white">
            {badge}
          </div>
        </div>
      </div>
    </header>
  );
}
