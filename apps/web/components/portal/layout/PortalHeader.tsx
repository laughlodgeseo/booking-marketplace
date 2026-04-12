"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bell, LogOut, Search } from "lucide-react";
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
  const badge = initials(displayName);
  const unreadCount = Math.max(0, props.unreadCount ?? 0);
  const notificationsHref = props.notificationsHref ?? "#";

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 text-primary shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="group inline-flex items-center gap-2">
          <span className="rounded-xl bg-white px-2 py-1 shadow-sm ring-1 ring-neutral-200">
            <Image
              src="/brand/logo.svg"
              alt="Laugh & Lodge"
              width={150}
              height={48}
              className="h-7 w-auto sm:h-8"
              priority
            />
          </span>

          <div className="hidden sm:block">
            <div className="inline-flex items-center gap-2">
              <div className="text-xs font-semibold text-secondary">
                {roleLabel(props.role, (key) => tPortal(key))}
              </div>
              <span className="h-1.5 w-1.5 rounded-full bg-brand/88" />
              <div className="text-xs font-semibold text-brand">{tPortal("operations")}</div>
            </div>
            <div className="text-sm font-semibold text-primary">{props.title}</div>
          </div>
        </Link>

        <div className="hidden min-w-0 flex-1 items-center gap-2 lg:flex xl:gap-3">
          <div className="relative min-w-0 flex-1 max-w-[360px] xl:max-w-[520px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
            <input
              type="search"
              placeholder={tPortal("searchPlaceholder")}
              className="h-11 w-full rounded-xl bg-white pl-10 pr-3 text-sm text-primary ring-1 ring-neutral-200 outline-none placeholder:text-muted focus-visible:ring-4 focus-visible:ring-brand/20"
            />
          </div>

          <div className="ml-auto flex min-w-0 items-center gap-2">
            {props.right ? <div className="hidden shrink-0 xl:block">{props.right}</div> : null}

            <LanguageSwitcher compact />

            <NotificationBell
              role={props.role ?? "customer"}
              notificationsHref={notificationsHref}
              initialUnreadCount={unreadCount}
            />

            <button
              type="button"
              onClick={props.onLogout}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-b from-brand to-brand-hover px-4 text-sm font-semibold text-accent-text ring-1 ring-brand/34 shadow-[0_12px_30px_rgba(79,70,229,0.34)] hover:brightness-105 hover:translate-y-[-1px] active:translate-y-0"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden xl:inline">{tPortal("logout")}</span>
            </button>

            <div className="ml-1 flex items-center gap-3 rounded-xl bg-neutral-100 px-4 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-xs font-bold text-white">
                {badge}
              </div>
              <div className="hidden xl:block">
                <div className="text-sm font-medium text-neutral-600">
                  {tPortal("welcomeBack", { name: firstName })}
                </div>
                <div className="text-xs text-muted">
                  {roleLabel(props.role, (key) => tPortal(key))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 lg:hidden">
          {props.right ? <div className="shrink-0">{props.right}</div> : null}

          <LanguageSwitcher compact />

          <Link
            href={notificationsHref}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white ring-1 ring-neutral-200 hover:translate-y-[-1px] hover:bg-accent-soft/22 active:translate-y-0"
            aria-label={tPortal("alerts")}
          >
            <Bell className="h-4 w-4 text-secondary" />
          </Link>

          <button
            type="button"
            onClick={props.onLogout}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-b from-brand to-brand-hover px-4 text-sm font-semibold text-white ring-1 ring-brand/34 shadow-[0_12px_30px_rgba(79,70,229,0.34)] hover:brightness-105 hover:translate-y-[-1px] active:translate-y-0"
          >
            <LogOut className="h-4 w-4" />
            {tPortal("logout")}
          </button>
        </div>
      </div>
    </header>
  );
}
