"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/auth-context";
import { PortalHeader } from "@/components/portal/layout/PortalHeader";
import {
  getRoleNav,
  groupNav,
  roleLabel,
  type PortalNavItem,
  type PortalRole,
} from "@/components/portal/layout/portal-navigation";
import { PortalSidebar } from "@/components/portal/layout/PortalSidebar";
import { getPortalUnreadCount, type PortalNotificationRole } from "@/lib/api/portal/notifications";
import { normalizeLocale } from "@/lib/i18n/config";

export type { PortalRole, PortalNavItem };

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

function loginHrefForRole(role?: PortalRole): string {
  if (role === "vendor") return "/vendor/login";
  if (role === "customer") return "/login?role=customer";
  return "/login";
}

function notificationRole(role?: PortalRole): PortalNotificationRole | null {
  if (role === "admin") return "admin";
  if (role === "vendor") return "vendor";
  if (role === "customer") return "customer";
  return null;
}

function notificationsHref(role?: PortalRole): string | null {
  if (role === "admin") return "/admin/notifications";
  if (role === "vendor") return "/vendor/notifications";
  if (role === "customer") return "/account/notifications";
  return null;
}

export function PortalShell(props: {
  role?: PortalRole;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  nav?: PortalNavItem[];
  children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const tPortal = useTranslations("portal");
  const isRtl = normalizeLocale(useLocale()) === "ar";
  const [unreadCount, setUnreadCount] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const activeNotificationRole = notificationRole(props.role);
  const notificationsPageHref = notificationsHref(props.role);
  const identityName = useMemo(() => {
    const first = user?.firstName?.trim();
    if (first) return first;
    const full = user?.fullName?.trim();
    if (full) return full;
    return null;
  }, [user?.firstName, user?.fullName]);

  // Enforce one role-aware sidebar source across all portals.
  const navItems = getRoleNav(props.role, (key) => tPortal(key));
  const groupedMobileNav = useMemo(() => groupNav(navItems), [navItems]);
  const roleName = roleLabel(props.role, (key) => tPortal(key));

  useEffect(() => {
    let alive = true;

    async function loadUnread() {
      if (!activeNotificationRole || !user?.id) {
        setUnreadCount(0);
        return;
      }
      try {
        const data = await getPortalUnreadCount(activeNotificationRole);
        if (!alive) return;
        setUnreadCount(data.unreadCount ?? 0);
      } catch {
        if (!alive) return;
        setUnreadCount(0);
      }
    }

    void loadUnread();
    return () => {
      alive = false;
    };
  }, [activeNotificationRole, pathname, user?.id]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // Redirect even if logout endpoint fails so user is not stranded.
    } finally {
      setLoggingOut(false);
      router.replace(loginHrefForRole(props.role));
    }
  }

  return (
    <div className="portal-density min-h-screen overflow-x-clip">
      {/* Background layer (portal-wide) */}
      <div className="pointer-events-none fixed inset-0 -z-10 portal-shell-bg" />

      {/* Soft vignette to increase separation (prevents “white on white”) */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_50%_-120px,rgb(var(--color-accent-rgb)/0.16),transparent_62%),radial-gradient(900px_500px_at_12%_12%,rgb(var(--color-accent-rgb)/0.10),transparent_58%),radial-gradient(900px_500px_at_88%_18%,rgb(var(--color-gold-rgb)/0.09),transparent_62%)]" />

      <PortalHeader
        role={props.role}
        title={props.title}
        right={props.right}
        userEmail={user?.email ?? null}
        userName={identityName}
        notificationsHref={notificationsPageHref ?? undefined}
        unreadCount={unreadCount}
        onLogout={() => {
          void handleLogout();
        }}
      />

      <div className="px-4 pb-2 pt-3 sm:px-6 lg:hidden">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              {roleName}
            </div>
            <div className="truncate text-base font-semibold text-primary">{props.title}</div>
          </div>

          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,236,255,0.84))] text-primary ring-1 ring-brand/22 shadow-[0_8px_20px_rgba(79,70,229,0.16)]"
            aria-label={tPortal("shell.openNavigation")}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className={cn("fixed inset-0 z-[70] overflow-x-hidden lg:hidden", mobileNavOpen ? "" : "pointer-events-none")}>
        <button
          type="button"
          aria-label={tPortal("shell.closeNavigation")}
          onClick={() => setMobileNavOpen(false)}
          className={cn(
            "absolute inset-0 bg-dark-1/46 backdrop-blur-sm transition-opacity",
            mobileNavOpen ? "opacity-100" : "opacity-0",
          )}
        />

        <aside
          className={cn(
            "absolute inset-y-0 flex w-[86%] max-w-sm flex-col overflow-hidden",
            isRtl ? "right-0" : "left-0",
            "bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,236,255,0.98))] shadow-[0_24px_64px_rgba(79,70,229,0.24)] ring-1 ring-line/22",
            "transition-transform duration-300 ease-out",
            mobileNavOpen ? "translate-x-0" : isRtl ? "translate-x-full" : "-translate-x-full",
          )}
        >
          <div className="px-4 pb-3 pt-[calc(0.9rem+env(safe-area-inset-top))]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-primary">{props.title}</div>
                <div className="mt-1 text-xs text-secondary">{props.subtitle ?? roleName}</div>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,236,255,0.84))] text-primary ring-1 ring-brand/22"
                aria-label={tPortal("shell.closeNavigation")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="space-y-5">
              {groupedMobileNav.map((group) => (
                <div key={group.group}>
                  <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                    {group.group}
                  </div>
                  <div className="portal-divider mt-2" />
                  <div className="mt-3 grid gap-2">
                    {group.items.map((item) => {
                      const active = isActive(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileNavOpen(false)}
                          className={cn(
                            "flex min-w-0 items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
                            active
                              ? "bg-brand text-accent-text shadow-[0_12px_28px_rgba(79,70,229,0.32)]"
                              : "bg-warm-base/92 text-primary ring-1 ring-line/32 hover:bg-accent-soft/26",
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span
                              className={cn(
                                "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                                active ? "bg-accent-text/20 text-accent-text" : "bg-accent-soft/34 text-brand",
                              )}
                            >
                              {item.icon}
                            </span>
                            <span className="truncate">{item.label}</span>
                          </span>
                          <span className={cn("text-xs", active ? "text-accent-text/80" : "text-muted")}>
                            •
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>
        </aside>
      </div>

      {/* Layout */}
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-[calc(2rem+env(safe-area-inset-bottom))] sm:pt-6 lg:flex-row lg:items-start lg:gap-6 lg:px-8 lg:pb-16 lg:pt-6">
        <PortalSidebar
          title={props.title}
          subtitle={props.subtitle}
          nav={navItems}
          userEmail={user?.email ?? null}
          userName={identityName}
          className="lg:w-72 lg:flex-shrink-0"
        />

        <main className="min-w-0 flex-1 overflow-y-auto">
          {/* Main shell card */}
          <div className="portal-card max-w-full overflow-hidden rounded-3xl bg-warm-base/92 lg:bg-surface/90">
            {/* Header band: increase contrast so it reads clearly on ivory */}
            <div className="relative bg-[linear-gradient(135deg,rgb(var(--color-surface-rgb)/0.98),rgb(var(--color-bg-2-rgb)/0.92))] px-4 py-4 sm:px-6 sm:py-5">
              {/* Top accent line */}
              <div className="pointer-events-none absolute inset-x-6 top-0 h-[2px] rounded-full bg-[linear-gradient(90deg,rgb(var(--color-accent-rgb)/0.75),rgb(var(--color-accent-rgb)/0.24),transparent_82%)]" />

              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted sm:text-xs lg:normal-case lg:tracking-normal">
                {roleName}
              </div>
              <h1 className="mt-1 text-lg font-semibold text-primary sm:text-xl lg:text-2xl">{props.title}</h1>
              {props.subtitle ? (
                <div className="mt-1 text-sm leading-relaxed text-secondary sm:text-base lg:text-sm lg:leading-normal">
                  {props.subtitle}
                </div>
              ) : null}

              <div className="portal-divider mt-4" />
            </div>

            {/* Content area: add subtle tint so pages like Calendar don’t look “flat” */}
            <div className="bg-[linear-gradient(180deg,rgb(var(--color-surface-rgb)/0.88),rgb(var(--color-bg-2-rgb)/0.62))] px-4 py-4 sm:px-6 sm:py-6">
              {props.children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
