"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
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
  if (role === "vendor") return "/vendor/login?next=%2Fvendor";
  if (role === "customer") return "/login?role=customer&next=%2Faccount";
  if (role === "admin") return "/login?next=%2Fadmin";
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

function initials(name: string | null | undefined, email: string | null | undefined): string {
  const src = name?.trim() || email?.trim() || "U";
  const parts = src.split(/[\s._@-]+/g).filter(Boolean);
  const first = parts[0]?.[0] ?? "U";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

const ROLE_DRAWER: Record<string, {
  avatarBg: string;
  activeItem: string;
  activeIcon: string;
  roleBadge: string;
  topAccent: string;
}> = {
  customer: {
    avatarBg:   "bg-indigo-600",
    activeItem: "bg-indigo-50 text-indigo-700",
    activeIcon: "bg-indigo-100 text-indigo-600",
    roleBadge:  "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60",
    topAccent:  "from-indigo-500 to-indigo-400",
  },
  vendor: {
    avatarBg:   "bg-brand",
    activeItem: "bg-brand/10 text-brand",
    activeIcon: "bg-brand/14 text-brand",
    roleBadge:  "bg-brand/10 text-brand ring-1 ring-brand/22",
    topAccent:  "from-brand to-brand-hover",
  },
  admin: {
    avatarBg:   "bg-slate-700",
    activeItem: "bg-slate-100 text-slate-800",
    activeIcon: "bg-slate-200 text-slate-700",
    roleBadge:  "bg-slate-100 text-slate-700 ring-1 ring-slate-200/60",
    topAccent:  "from-slate-700 to-slate-600",
  },
};

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
    const full = user?.fullName?.trim();
    if (full) return full;
    const first = user?.firstName?.trim();
    if (first) return first;
    return null;
  }, [user?.firstName, user?.fullName]);

  const navItems = getRoleNav(props.role, (key) => tPortal(key));
  const groupedMobileNav = useMemo(() => groupNav(navItems), [navItems]);
  const roleName = roleLabel(props.role, (key) => tPortal(key));
  const drawerStyle = ROLE_DRAWER[props.role ?? "customer"] ?? ROLE_DRAWER.customer;
  const avatarText = initials(identityName, user?.email);
  const displayName = identityName || tPortal("defaultWelcome");
  const firstName = displayName.split(/\s+/g)[0] || displayName;

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

      {/* Soft vignette */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_50%_-120px,rgb(var(--color-accent-rgb)/0.12),transparent_62%),radial-gradient(900px_500px_at_12%_12%,rgb(var(--color-accent-rgb)/0.07),transparent_58%),radial-gradient(900px_500px_at_88%_18%,rgb(var(--color-gold-rgb)/0.06),transparent_62%)]" />

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

      {/* Mobile page context bar */}
      <div className="px-4 pb-2 pt-3 sm:px-6 lg:hidden">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              {roleName}
            </div>
            <div className="truncate text-[15px] font-semibold text-primary">{props.title}</div>
          </div>

          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm ring-1 ring-neutral-200"
            aria-label={tPortal("shell.openNavigation")}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      <div className={cn("fixed inset-0 z-[70] overflow-x-hidden lg:hidden", mobileNavOpen ? "" : "pointer-events-none")}>
        {/* Backdrop */}
        <button
          type="button"
          aria-label={tPortal("shell.closeNavigation")}
          onClick={() => setMobileNavOpen(false)}
          className={cn(
            "absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity",
            mobileNavOpen ? "opacity-100" : "opacity-0",
          )}
        />

        {/* Drawer panel */}
        <aside
          className={cn(
            "absolute inset-y-0 flex w-[85%] max-w-[340px] flex-col overflow-hidden",
            isRtl ? "right-0" : "left-0",
            "bg-white shadow-2xl",
            "transition-transform duration-300 ease-out",
            mobileNavOpen ? "translate-x-0" : isRtl ? "translate-x-full" : "-translate-x-full",
          )}
        >
          {/* Drawer top accent bar */}
          <div className={cn("h-1 w-full bg-gradient-to-r", drawerStyle.topAccent)} />

          {/* Drawer header — account summary */}
          <div className="border-b border-neutral-100 px-4 pb-4 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white", drawerStyle.avatarBg)}>
                  {avatarText}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-primary">{displayName}</div>
                  <div className="truncate text-[11px] text-muted">{user?.email ?? "—"}</div>
                  <span className={cn("mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", drawerStyle.roleBadge)}>
                    {roleName}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-neutral-100"
                aria-label={tPortal("shell.closeNavigation")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Greeting */}
            <div className="mt-3 text-xs text-secondary">
              {tPortal("welcomeBack", { name: firstName })}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <div className="space-y-4">
              {groupedMobileNav.map((group) => (
                <div key={group.group}>
                  <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                    {group.group}
                  </div>
                  <div className="grid gap-0.5">
                    {group.items.map((item) => {
                      const active = isActive(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileNavOpen(false)}
                          className={cn(
                            "flex min-w-0 items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-all duration-150",
                            active
                              ? drawerStyle.activeItem
                              : "text-secondary hover:bg-neutral-50 hover:text-primary",
                          )}
                        >
                          <span
                            className={cn(
                              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                              active
                                ? drawerStyle.activeIcon
                                : "bg-neutral-100 text-muted",
                            )}
                          >
                            {item.icon}
                          </span>
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          {/* Drawer footer — logout */}
          <div className="border-t border-neutral-100 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <button
              type="button"
              disabled={loggingOut}
              onClick={() => void handleLogout()}
              className="flex w-full items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-secondary hover:border-danger/30 hover:bg-danger/5 hover:text-danger transition-all disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? tPortal("shell.loggingOut") : tPortal("logout")}

            </button>
          </div>
        </aside>
      </div>

      {/* Main layout */}
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-[calc(2rem+env(safe-area-inset-bottom))] sm:pt-6 lg:flex-row lg:items-start lg:gap-6 lg:px-8 lg:pb-16 lg:pt-6">
        <PortalSidebar
          role={props.role}
          title={props.title}
          subtitle={props.subtitle}
          nav={navItems}
          userEmail={user?.email ?? null}
          userName={identityName}
          className="lg:w-72 lg:flex-shrink-0"
        />

        <main className="min-w-0 flex-1 overflow-y-auto">
          {/* Main shell card */}
          <div className="portal-card max-w-full overflow-hidden rounded-2xl bg-warm-base/92 lg:bg-surface/90">
            {/* Header band */}
            <div className="relative bg-[linear-gradient(135deg,rgb(var(--color-surface-rgb)/0.98),rgb(var(--color-bg-2-rgb)/0.92))] px-4 py-4 sm:px-6 sm:py-5">
              {/* Top accent line */}
              <div className="pointer-events-none absolute inset-x-6 top-0 h-[2px] rounded-full bg-[linear-gradient(90deg,rgb(var(--color-accent-rgb)/0.70),rgb(var(--color-accent-rgb)/0.22),transparent_82%)]" />

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                    {roleName}
                  </div>
                  <h1 className="mt-1 text-lg font-semibold text-primary sm:text-xl">{props.title}</h1>
                  {props.subtitle ? (
                    <div className="mt-1 text-sm leading-relaxed text-secondary">
                      {props.subtitle}
                    </div>
                  ) : null}
                </div>

                {props.right ? (
                  <div className="shrink-0">{props.right}</div>
                ) : null}
              </div>

              <div className="portal-divider mt-4" />
            </div>

            {/* Content area */}
            <div className="bg-[linear-gradient(180deg,rgb(var(--color-surface-rgb)/0.88),rgb(var(--color-bg-2-rgb)/0.62))] px-4 py-4 sm:px-6 sm:py-6">
              {props.children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
