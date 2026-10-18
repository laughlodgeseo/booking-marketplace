"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, X } from "lucide-react";
import { useLocale } from "next-intl";
import { useAuth } from "@/lib/auth/auth-context";
import { setLocaleCookie } from "@/lib/i18n/client";

const links = [
  ["/properties", "Find your stay", "ابحث عن إقامتك"],
  ["/gallery", "Look inside", "ألق نظرة بالداخل"],
  ["/owners", "For owners", "للملاك"],
  ["/services", "Our care", "خدماتنا"],
  ["/about", "Our story", "قصتنا"],
  ["/contact", "Let’s talk", "تواصل معنا"],
];
export default function FloatingHeader() {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(0);
  const previewPhotos = [
    "/images/home/why-b.webp",
    "/images/home/interior-suite.webp",
    "/images/owners/hero-4k/main_business_bay-4k.webp",
    "/images/owners/hero-4k/support_luxury_interior-4k.webp",
    "/areas/downtown-dubai.webp",
    "/areas/dubai-creek-harbour.webp",
  ];
  const [scrolled, setScrolled] = useState(false);
  const path = usePathname();
  const router = useRouter();
  const ar = useLocale() === "ar";
  const { user, logout } = useAuth();
  const reduced = useReducedMotion();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 40);
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  useEffect(() => {
    if (!open) return;
    const el = dialog.current;
    const returnFocus = trigger.current;
    el?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      el?.close();
      document.body.style.overflow = previous;
      returnFocus?.focus();
    };
  }, [open]);
  useEffect(() => {
    const depart = () => setOpen(false);
    window.addEventListener("story:depart", depart);
    return () => window.removeEventListener("story:depart", depart);
  }, []);
  const close = () => setOpen(false);
  const home = path === "/";
  return (
    <>
      <a href="#main-content" className="story-skip">
        {ar ? "انتقل للمحتوى" : "Skip to content"}
      </a>
      <header
        className={`story-header ${home && !scrolled ? "story-header-over" : ""}`}
      >
        <Link
          href="/"
          className="story-wordmark"
          aria-label="Laugh and Lodge home"
        >
          laugh<span>&</span>lodge<span className="story-brand-dot">.</span>
        </Link>
        <nav
          aria-label={ar ? "التنقل الرئيسي" : "Main navigation"}
          className="story-desktop-nav"
        >
          <Link href="/properties">{ar ? "الإقامات" : "The stays"}</Link>
          <Link href="/gallery">{ar ? "المعرض" : "The spaces"}</Link>
          <Link href="/owners">{ar ? "للملاك" : "For owners"}</Link>
        </nav>
        <div className="story-header-tools">
          <button
            onClick={() => {
              setLocaleCookie(ar ? "en" : "ar");
              router.refresh();
            }}
            lang={ar ? "en" : "ar"}
            aria-label={ar ? "Switch to English" : "التبديل إلى العربية"}
          >
            {ar ? "EN" : "العربية"}
          </button>
          <Link
            className="story-account-link"
            href={
              user ? (user.role === "ADMIN" ? "/admin" : "/account") : "/login"
            }
          >
            {user ? (ar ? "حسابي" : "My account") : ar ? "دخول" : "Sign in"}
          </Link>
          <button
            ref={trigger}
            className="story-menu-toggle"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            {ar ? "القائمة" : "Menu"}
            <span aria-hidden>
              <i />
              <i />
            </span>
          </button>
        </div>
      </header>
      <AnimatePresence>
        {open && (
          <motion.dialog
            ref={dialog}
            className="story-menu"
            aria-labelledby="story-menu-title"
            onCancel={close}
            initial={reduced ? false : { clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.65, ease: [0.76, 0, 0.24, 1] }}
          >
            <div className="story-menu-top">
              <Link onClick={close} href="/" className="story-wordmark">
                laugh<span>&</span>lodge.
              </Link>
              <button
                onClick={close}
                aria-label={ar ? "إغلاق القائمة" : "Close menu"}
              >
                <X size={26} />
              </button>
            </div>
            <div className="story-menu-body">
              <div className="story-menu-photo">
                <AnimatePresence initial={false}>
                  <motion.div
                    key={preview}
                    className="v2-menu-image"
                    initial={
                      reduced
                        ? false
                        : { clipPath: "inset(0% 0% 100% 0%)", scale: 1.1 }
                    }
                    animate={{ clipPath: "inset(0% 0% 0% 0%)", scale: 1 }}
                    exit={{ clipPath: "inset(100% 0% 0% 0%)" }}
                    transition={{ duration: 0.65, ease: [0.76, 0, 0.24, 1] }}
                  >
                    <Image
                      src={previewPhotos[preview]}
                      alt=""
                      fill
                      sizes="40vw"
                      className="object-cover"
                    />
                  </motion.div>
                </AnimatePresence>
                <p>
                  {ar
                    ? "مدينة واحدة. احتمالات كثيرة."
                    : "One city. So many ways in."}
                </p>
              </div>
              <nav aria-label={ar ? "جميع الصفحات" : "All pages"}>
                <h2 id="story-menu-title" className="sr-only">
                  {ar ? "اكتشف لاف آند لودج" : "Explore Laugh & Lodge"}
                </h2>
                {links.map(([href, en, arabic], i) => (
                  <motion.div
                    key={href}
                    initial={reduced ? false : { y: 34, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.12 + i * 0.045, duration: 0.55 }}
                  >
                    <Link
                      href={href}
                      onClick={close}
                      onMouseEnter={() => setPreview(i)}
                      onFocus={() => setPreview(i)}
                      aria-current={path === href ? "page" : undefined}
                    >
                      {ar ? arabic : en}
                      <ArrowUpRight />
                    </Link>
                  </motion.div>
                ))}
              </nav>
            </div>
            <div className="story-menu-bottom">
              <Link href="/pricing" onClick={close}>
                {ar ? "الأسعار" : "Pricing"}
              </Link>
              <Link href="/blog" onClick={close}>
                {ar ? "المجلة" : "Journal"}
              </Link>
              {user?.role === "VENDOR" && (
                <Link href="/vendor" onClick={close}>
                  {ar ? "لوحة المالك" : "Host dashboard"}
                </Link>
              )}
              {user && (
                <button
                  onClick={async () => {
                    await logout();
                    close();
                  }}
                >
                  {ar ? "تسجيل الخروج" : "Sign out"}
                </button>
              )}
              <a href="mailto:Info@rentpropertyuae.com">
                Info@rentpropertyuae.com
              </a>
            </div>
          </motion.dialog>
        )}
      </AnimatePresence>
    </>
  );
}
