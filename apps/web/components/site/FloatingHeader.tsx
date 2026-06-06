"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  ChevronDown,
  LogOut,
  Menu,
  ArrowRight,
  User2,
  UserRound,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/auth-context";
import type { UserRole } from "@/lib/auth/auth.types";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { normalizeLocale } from "@/lib/i18n/config";

type NavLabelKey =
  | "home"
  | "stays"
  | "services"
  | "owners"
  | "gallery"
  | "pricing"
  | "contact";

type NavItem = { href: string; labelKey: NavLabelKey };

const NAV: readonly NavItem[] = [
  { href: "/", labelKey: "home" },
  { href: "/properties", labelKey: "stays" },
  { href: "/services", labelKey: "services" },
  { href: "/owners", labelKey: "owners" },
  { href: "/gallery", labelKey: "gallery" },
  { href: "/pricing", labelKey: "pricing" },
  { href: "/contact", labelKey: "contact" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function dashboardPathForRole(role: UserRole): string {
  if (role === "ADMIN") return "/admin";
  return "/account";
}

function getFirstName(user: { firstName?: string | null; fullName?: string | null; email?: string | null } | null | undefined): string | null {
  if (!user) return null;
  return user.firstName?.trim() || user.fullName?.split(" ")[0]?.trim() || null;
}

function getInitials(user: { firstName?: string | null; fullName?: string | null; email?: string | null } | null | undefined): string {
  const src = (user?.fullName?.trim() || user?.firstName?.trim() || user?.email?.trim() || "U");
  const parts = src.split(/[\s._@-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "U";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

/* ── Portal Switcher Dropdown for vendor-capable users ──────────── */
function PortalSwitcher(props: {
  firstName: string | null;
  onLogout: () => void;
  loggingOut: boolean;
  t: ReturnType<typeof useTranslations<"nav">>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-[#ded2c2]/60 bg-[#f6efe5]/80 px-3.5 text-sm font-semibold text-primary shadow-sm transition hover:bg-[#f6efe5] active:scale-[0.98]"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
          {props.firstName ? props.firstName[0]?.toUpperCase() : <UserRound className="h-3.5 w-3.5" />}
        </span>
        <span className="hidden sm:inline">{props.firstName ?? props.t("myAccount")}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full z-[100] mt-2 w-52 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_16px_44px_rgba(30,27,75,0.16)]"
          >
            {/* Header */}
            <div className="border-b border-neutral-100 px-4 py-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Portal access</div>
            </div>

            <div className="p-1.5 space-y-0.5">
              <Link
                href="/account"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-primary transition hover:bg-neutral-50"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <User2 className="h-3.5 w-3.5" />
                </span>
                {props.t("myAccount")}
              </Link>

              <Link
                href="/vendor"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white">
                  <Building2 className="h-3.5 w-3.5" />
                </span>
                {props.t("vendorDashboard")}
              </Link>

              <div className="my-1 border-t border-neutral-100" />

              <button
                type="button"
                role="menuitem"
                onClick={() => { setOpen(false); props.onLogout(); }}
                disabled={props.loggingOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-secondary transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100">
                  <LogOut className="h-3.5 w-3.5" />
                </span>
                {props.loggingOut ? props.t("loggingOut") : props.t("logout")}
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function FloatingHeader() {
  const { status, user, logout } = useAuth();
  const pathname = usePathname();
  const t = useTranslations("nav");
  const locale = normalizeLocale(useLocale());
  const isRtl = locale === "ar";

  const [isVisible, setIsVisible] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const lastScrollYRef = useRef(0);

  const dashboardHref = user ? dashboardPathForRole(user.role) : "/account";
  const navItems = useMemo(
    () => NAV.map((item) => ({ href: item.href, label: t(item.labelKey) })),
    [t],
  );
  const drawerX = isRtl ? -40 : 40;
  const firstName = getFirstName(user);
  const initials = getInitials(user);

  useEffect(() => {
    const threshold = 10;
    const topThreshold = 8;

    function onScroll() {
      const y = window.scrollY || 0;
      const last = lastScrollYRef.current;
      const atTop = y <= topThreshold;

      setIsAtTop(atTop);

      if (atTop) {
        setIsVisible(true);
      } else if (y > last + threshold) {
        setIsVisible(false);
        setMobileOpen(false);
      } else if (y < last - threshold) {
        setIsVisible(true);
      }

      lastScrollYRef.current = y;
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      setMobileOpen(false);
    } finally {
      setLoggingOut(false);
    }
  }

  const showAuthSkeleton = status === "loading";
  const headerSurfaceClass = isAtTop
    ? "border-b border-[#ded2c2]/70 bg-[#fffdf9]/95 shadow-[0_1px_0_rgba(184,115,51,0.08)] backdrop-blur-md"
    : "border-b border-[#ded2c2]/80 bg-[#fffdf9]/96 shadow-[0_12px_34px_rgba(30,27,75,0.10)] backdrop-blur-md";
  const headerVisibilityClass = isVisible ? "translate-y-0" : "-translate-y-full";

  const secondaryActionClass =
    "inline-flex h-10 items-center justify-center rounded-full bg-[#f6efe5]/80 px-4 text-sm font-semibold text-primary transition hover:bg-brand-soft-2";
  const softActionClass =
    "inline-flex h-10 items-center justify-center rounded-full bg-[#f6efe5] px-4 text-sm font-semibold text-primary shadow-sm transition hover:bg-brand-soft-2";
  const primaryActionClass =
    "inline-flex h-10 items-center justify-center rounded-full bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 active:bg-indigo-800";

  return (
    <>
      <header
        className={[
          "fixed left-0 right-0 top-0 z-[90] w-full transform transition-transform duration-200 ease-out",
          headerVisibilityClass,
        ].join(" ")}
      >
        <div className={["w-full transition-shadow duration-200 ease-out", headerSurfaceClass].join(" ")}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* ── Desktop layout ─────────────────────────────────────── */}
            <div className="hidden h-[72px] w-full items-center lg:grid lg:h-[76px] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-4">
              <nav className="flex items-center gap-4">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "relative text-sm font-semibold transition",
                      isActive(pathname, item.href)
                        ? "text-brand after:absolute after:-bottom-2 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-brand"
                        : "text-primary/88 hover:text-brand",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <Link href="/" className="mx-auto flex items-center justify-center gap-3">
                <Image
                  src="/brand/logo.svg"
                  alt="Laugh & Lodge"
                  width={200}
                  height={72}
                  priority
                  className="h-12 w-auto"
                />
              </Link>

              <div className="flex items-center justify-end gap-2">
                <LanguageSwitcher compact />

                {showAuthSkeleton ? (
                  <div className="h-10 w-[160px] animate-pulse rounded-full bg-warm-alt/80" />
                ) : user ? (
                  user.role === "VENDOR" ? (
                    /* ── Vendor: compact portal switcher ── */
                    <PortalSwitcher
                      firstName={firstName}
                      onLogout={handleLogout}
                      loggingOut={loggingOut}
                      t={t}
                    />
                  ) : (
                    /* ── Customer/Admin: single dashboard button ── */
                    <>
                      <Link href={dashboardHref} className={primaryActionClass} title={t("dashboard")}>
                        <span className="me-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold text-white">
                          {initials}
                        </span>
                        {t("dashboard")}
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className={`${softActionClass} disabled:opacity-60`}
                        title={t("logout")}
                      >
                        <LogOut className="me-2 h-4 w-4" />
                        {loggingOut ? t("loggingOut") : t("logout")}
                      </button>
                    </>
                  )
                ) : (
                  <>
                    <Link href="/auth?mode=login" className={secondaryActionClass}>
                      {t("login")}
                    </Link>
                    <Link href="/auth?mode=signup" className={primaryActionClass}>
                      {t("signUp")}
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* ── Mobile top bar ──────────────────────────────────────── */}
            <div className="relative flex h-16 items-center justify-between lg:hidden">
              <div className="flex items-center gap-2">
                <LanguageSwitcher compact />
              </div>

              <Link href="/" className="absolute left-1/2 -translate-x-1/2">
                <Image
                  src="/brand/logo.svg"
                  alt="Laugh & Lodge"
                  width={200}
                  height={72}
                  priority
                  className="h-8 w-auto"
                />
              </Link>

              <div className="flex items-center gap-2">
                <motion.button
                  type="button"
                  onClick={() => setMobileOpen((v) => !v)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-primary shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                  aria-label={t("toggleMenu")}
                  aria-expanded={mobileOpen}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.span
                    className="inline-flex"
                    animate={{ rotate: mobileOpen ? 90 : 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                  >
                    {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </motion.span>
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ──────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="fixed inset-0 z-[85] bg-brand/24"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              className={[
                "absolute inset-y-0 w-[min(24rem,92vw)] overflow-y-auto border border-neutral-200 bg-white px-4 pb-6 pt-16 shadow-[0_24px_68px_rgba(79,70,229,0.18)]",
                isRtl ? "left-0 rounded-r-3xl" : "right-0 rounded-l-3xl",
              ].join(" ")}
              initial={{ x: drawerX, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: drawerX, opacity: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Auth section */}
              <div className="mb-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                {showAuthSkeleton ? (
                  <div className="h-10 w-full animate-pulse rounded-xl bg-neutral-200" />
                ) : user ? (
                  <div className="space-y-3">
                    {/* User identity */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-primary">{user.email}</div>
                        <div className="text-xs text-secondary">
                          {user.role}
                          {!user.isEmailVerified ? ` • ${t("emailNotVerified")}` : ""}
                        </div>
                      </div>
                    </div>

                    {/* Portal nav buttons */}
                    <div className="grid gap-2">
                      {user.role === "VENDOR" ? (
                        <>
                          <Link
                            href="/account"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-primary hover:bg-neutral-50 transition"
                          >
                            <User2 className="h-4 w-4 text-indigo-600" />
                            {t("myAccount")}
                          </Link>
                          <Link
                            href="/vendor"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                          >
                            <Building2 className="h-4 w-4" />
                            {t("vendorDashboard")}
                          </Link>
                        </>
                      ) : (
                        <Link
                          href={dashboardHref}
                          onClick={() => setMobileOpen(false)}
                          className={`${primaryActionClass} w-full`}
                        >
                          {t("dashboard")}
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="flex w-full items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-secondary hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-60 transition"
                      >
                        <LogOut className="h-4 w-4" />
                        {loggingOut ? t("loggingOut") : t("logout")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Link
                      href="/auth?mode=login"
                      onClick={() => setMobileOpen(false)}
                      className={`${secondaryActionClass} w-full`}
                    >
                      {t("login")}
                    </Link>
                    <Link
                      href="/auth?mode=signup"
                      onClick={() => setMobileOpen(false)}
                      className={`${primaryActionClass} w-full`}
                    >
                      {t("signUp")}
                    </Link>
                  </div>
                )}
              </div>

              {/* Nav items */}
              <div className="grid gap-2">
                {navItems.map((item, idx) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: drawerX * 0.35 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: drawerX * 0.2 }}
                    transition={{ duration: 0.2, delay: 0.04 * idx }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={[
                        "group relative flex items-center justify-between overflow-hidden rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200",
                        "hover:-translate-y-0.5 hover:bg-neutral-100 active:translate-y-0 active:scale-[0.99]",
                        isActive(pathname, item.href)
                          ? "bg-brand/10 text-brand before:absolute before:bottom-2 before:left-0 before:top-2 before:w-1 before:rounded-r before:bg-brand"
                          : "text-primary",
                      ].join(" ")}
                    >
                      <span>{item.label}</span>
                      <ArrowRight className="h-4 w-4 text-brand/45 transition-transform duration-200 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
