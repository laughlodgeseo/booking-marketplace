"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ArrowRight, LogOut, UserRound } from "lucide-react";
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
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "VENDOR":
      return "/vendor";
    case "CUSTOMER":
    default:
      return "/account";
  }
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
    ? "bg-white/95 shadow-sm"
    : "bg-white/98 shadow-md";
  const headerVisibilityClass = isVisible ? "translate-y-0" : "-translate-y-full";

  const secondaryActionClass =
    "inline-flex h-11 items-center justify-center rounded-full bg-warm-alt/75 px-4 text-sm font-semibold text-primary transition hover:bg-brand-soft-2";
  const softActionClass =
    "inline-flex h-11 items-center justify-center rounded-full bg-warm-alt px-4 text-sm font-semibold text-primary shadow-sm transition hover:bg-brand-soft-2";
  const primaryActionClass =
    "inline-flex h-11 items-center justify-center rounded-full bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 active:bg-indigo-800";

  return (
    <>
      <header
        className={[
          "fixed left-0 right-0 top-0 z-[90] w-full transform transition-transform duration-200 ease-out",
          headerVisibilityClass,
        ].join(" ")}
      >
        <div className={["w-full backdrop-blur-sm transition-shadow duration-200 ease-out", headerSurfaceClass].join(" ")}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="hidden h-[76px] w-full items-center lg:grid lg:h-[80px] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-4">
              <nav className="flex items-center gap-5">
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
                  width={220}
                  height={80}
                  priority
                  className="h-[3.25rem] w-auto"
                />
              </Link>

              <div className="flex items-center justify-end gap-2">
                <LanguageSwitcher compact />

                <Link href="/properties" className={softActionClass}>
                  {t("explore")}
                  <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" />
                </Link>

                {showAuthSkeleton ? (
                  <div className="h-11 w-[180px] animate-pulse rounded-full bg-warm-alt/80" />
                ) : user ? (
                  <>
                    <Link href={dashboardHref} className={primaryActionClass} title={t("dashboard")}>
                      <UserRound className="me-2 h-4 w-4" />
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
                ) : (
                  <>
                    <Link href="/login" className={secondaryActionClass}>
                      {t("login")}
                    </Link>
                    <Link href="/signup" className={primaryActionClass}>
                      {t("signUp")}
                    </Link>
                  </>
                )}
              </div>
          </div>

            <div className="relative flex h-14 items-center justify-between lg:hidden">
              <div className="flex items-center gap-2">
                <LanguageSwitcher compact />
              </div>

              <Link href="/" className="absolute left-1/2 -translate-x-1/2">
                <Image
                  src="/brand/logo.svg"
                  alt="Laugh & Lodge"
                  width={220}
                  height={80}
                  priority
                  className="h-9 w-auto"
                />
              </Link>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMobileOpen((v) => !v)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-warm-alt text-primary shadow-sm"
                  aria-label={t("toggleMenu")}
                  aria-expanded={mobileOpen}
                >
                  {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="fixed inset-0 z-[85] bg-ink/25 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              className={[
                "absolute inset-y-0 w-[min(24rem,92vw)] overflow-y-auto border-line bg-surface px-4 pb-6 pt-16 shadow-2xl",
                isRtl ? "left-0 border-r" : "right-0 border-l",
              ].join(" ")}
              initial={{ x: drawerX, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: drawerX, opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 rounded-2xl bg-warm-alt/90 p-3">
                {showAuthSkeleton ? (
                  <div className="h-11 w-full animate-pulse rounded-full bg-warm-alt/80" />
                ) : user ? (
                  <div className="space-y-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-primary">{user.email}</div>
                      <div className="text-xs text-secondary">
                        {t("role")}: {user.role}
                        {!user.isEmailVerified ? ` • ${t("emailNotVerified")}` : ""}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Link
                        href={dashboardHref}
                        onClick={() => setMobileOpen(false)}
                        className={`${primaryActionClass} w-full`}
                      >
                        {t("dashboard")}
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className={`${softActionClass} w-full disabled:opacity-60`}
                      >
                        <LogOut className="me-2 h-4 w-4" />
                        {loggingOut ? t("loggingOut") : t("logout")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Link
                      href="/login"
                      onClick={() => setMobileOpen(false)}
                      className={`${secondaryActionClass} w-full bg-surface/90`}
                    >
                      {t("login")}
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMobileOpen(false)}
                      className={`${primaryActionClass} w-full`}
                    >
                      {t("signUp")}
                    </Link>
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={[
                      "rounded-2xl px-3 py-3 text-sm font-semibold transition",
                      isActive(pathname, item.href) ? "bg-brand-soft text-brand" : "text-primary hover:bg-warm-alt",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
