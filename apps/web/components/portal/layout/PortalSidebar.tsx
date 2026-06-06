"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LayoutDashboard } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PortalNavItem, PortalRole } from "@/components/portal/layout/portal-navigation";
import { groupNav, roleLabel } from "@/components/portal/layout/portal-navigation";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

function initials(name: string | null | undefined, email: string | null | undefined): string {
  const src = name?.trim() || email?.trim() || "U";
  const parts = src.split(/[\s._@-]+/g).filter(Boolean);
  const first = parts[0]?.[0] ?? "U";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

const ROLE_STYLE: Record<string, {
  roleChip: string;
  roleDot: string;
  activeItem: string;
  activeIcon: string;
  activeBullet: string;
  signedInBg: string;
  avatarBg: string;
  accentText: string;
}> = {
  customer: {
    roleChip:    "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60",
    roleDot:     "bg-indigo-400",
    activeItem:  "bg-indigo-50/80 text-indigo-700",
    activeIcon:  "bg-indigo-100 text-indigo-600",
    activeBullet: "bg-indigo-500",
    signedInBg:  "bg-gradient-to-br from-indigo-50 to-slate-50",
    avatarBg:    "bg-indigo-600",
    accentText:  "text-indigo-600",
  },
  vendor: {
    roleChip:    "bg-brand/10 text-brand ring-1 ring-brand/22",
    roleDot:     "bg-brand",
    activeItem:  "bg-brand/10 text-brand",
    activeIcon:  "bg-brand/14 text-brand",
    activeBullet: "bg-brand",
    signedInBg:  "bg-gradient-to-br from-brand/8 to-slate-50",
    avatarBg:    "bg-brand",
    accentText:  "text-brand",
  },
  admin: {
    roleChip:    "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200/60",
    roleDot:     "bg-indigo-600",
    activeItem:  "bg-indigo-50 text-indigo-800",
    activeIcon:  "bg-indigo-100 text-indigo-700",
    activeBullet: "bg-indigo-700",
    signedInBg:  "bg-gradient-to-br from-indigo-50/80 to-slate-50",
    avatarBg:    "bg-indigo-700",
    accentText:  "text-indigo-700",
  },
};

export function PortalSidebar(props: {
  role?: PortalRole;
  title: string;
  subtitle?: string;
  nav: PortalNavItem[];
  userEmail: string | null;
  userName?: string | null;
  footerHint?: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const tPortal = useTranslations("portal");
  const grouped = groupNav(props.nav);
  const style = ROLE_STYLE[props.role ?? "customer"] ?? ROLE_STYLE.customer;
  const roleName = roleLabel(props.role, (key) => tPortal(key));
  const avatarText = initials(props.userName, props.userEmail);
  const displayName = props.userName?.trim() || tPortal("defaultWelcome");

  return (
    <aside className={cn("hidden overflow-x-hidden lg:block lg:w-[280px] lg:shrink-0", props.className)}>
      <div className="sticky top-[74px] overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200/70">

        {/* Sidebar header */}
        <div className="border-b border-neutral-100 px-4 py-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                <LayoutDashboard className="h-4 w-4 text-secondary" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-primary">{props.title}</div>
                {props.subtitle ? (
                  <div className="truncate text-[11px] text-muted leading-tight">{props.subtitle}</div>
                ) : null}
              </div>
            </div>

            <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", style.roleChip)}>
              <span className={cn("h-1.5 w-1.5 rounded-full", style.roleDot)} />
              {roleName}
            </span>
          </div>
        </div>

        {/* Navigation groups */}
        <nav className="px-3 py-3">
          <div className="space-y-4">
            {grouped.map((group) => (
              <div key={group.group}>
                <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {group.group}
                </div>

                <div className="grid gap-0.5">
                  {group.items.map((item) => {
                    const active = isActive(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "group relative flex w-full min-w-0 items-center justify-between rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-150",
                          active
                            ? style.activeItem
                            : "text-secondary hover:bg-neutral-50 hover:text-primary",
                        )}
                      >
                        {active ? (
                          <span className={cn("pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-r-full", style.activeBullet)} />
                        ) : null}

                        <span className="flex min-w-0 flex-1 items-center gap-2.5">
                          <span
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all",
                              active
                                ? style.activeIcon
                                : "bg-neutral-100 text-muted group-hover:bg-neutral-200 group-hover:text-primary",
                            )}
                          >
                            {item.icon ?? <ChevronRight className="h-3.5 w-3.5" />}
                          </span>

                          <span className="truncate text-[13px]">{item.label}</span>
                        </span>

                        <ChevronRight
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 transition",
                            active ? "opacity-60" : "opacity-25 group-hover:opacity-50",
                          )}
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Signed-in card */}
        <div className={cn("mx-3 mb-3 rounded-xl p-3", style.signedInBg)}>
          <div className="flex items-center gap-2.5">
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white", style.avatarBg)}>
              {avatarText}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-primary">{displayName}</div>
              <div className="truncate text-[11px] text-muted leading-tight">{props.userEmail || "—"}</div>
            </div>
          </div>
          <div className="mt-2.5 border-t border-neutral-200/60 pt-2">
            <div className="text-[11px] leading-relaxed text-secondary">
              {props.footerHint ?? tPortal("footerHint")}
            </div>
            <div className={cn("mt-1.5 text-[11px] font-semibold", style.accentText)}>
              {tPortal("premiumConsole")}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
