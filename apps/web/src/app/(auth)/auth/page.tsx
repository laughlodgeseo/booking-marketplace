"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Building2, User2, ArrowRight } from "lucide-react";
import { useLocale } from "next-intl";
import { normalizeLocale } from "@/lib/i18n/config";
import { DubaiAuthCollageBackground } from "@/components/auth/DubaiAuthCollageBackground";

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

type AuthMode = "login" | "signup";
type AuthRoleUi = "customer" | "vendor";

function readMode(raw: string | null): AuthMode {
  return raw === "signup" ? "signup" : "login";
}

function readRole(raw: string | null): AuthRoleUi {
  return raw === "vendor" ? "vendor" : "customer";
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

const COPY = {
  en: {
    titleLogin: "Welcome back",
    titleSignup: "Create your account",
    subtitleLogin: "Select your role to continue securely.",
    subtitleSignup: "Select an account type to begin.",
    tabLogin: "Log in",
    tabSignup: "Sign up",
    customer: "Customer",
    customerDesc: "Book stays, manage trips, documents, refunds, and support.",
    vendor: "Vendor",
    vendorDesc: "List homes, manage availability, bookings, pricing, and operations.",
    continueLogin: "Continue to sign in",
    continueSignup: "Continue to account setup",
    backHome: "Back to home",
    footnoteLoginPrefix: "New here?",
    footnoteLoginAction: "Create an account",
    footnoteSignupPrefix: "Already have an account?",
    footnoteSignupAction: "Sign in",
    selectRole: "Select account type",
    termsPrefix: "By continuing, you agree to our",
    terms: "Terms",
    and: "and",
    privacy: "Privacy Policy",
  },
  ar: {
    titleLogin: "مرحباً بعودتك",
    titleSignup: "أنشئ حسابك",
    subtitleLogin: "اختر دورك للمتابعة بشكل آمن.",
    subtitleSignup: "اختر نوع الحساب لبدء التسجيل.",
    tabLogin: "تسجيل الدخول",
    tabSignup: "إنشاء حساب",
    customer: "عميل",
    customerDesc: "احجز الإقامات وأدر الرحلات والمستندات والاسترداد والدعم.",
    vendor: "مزوّد",
    vendorDesc: "أضف الوحدات وأدر التوافر والحجوزات والأسعار والعمليات.",
    continueLogin: "المتابعة إلى تسجيل الدخول",
    continueSignup: "المتابعة إلى إعداد الحساب",
    backHome: "العودة للرئيسية",
    footnoteLoginPrefix: "جديد هنا؟",
    footnoteLoginAction: "أنشئ حساباً",
    footnoteSignupPrefix: "لديك حساب بالفعل؟",
    footnoteSignupAction: "تسجيل الدخول",
    selectRole: "اختر نوع الحساب",
    termsPrefix: "بالمتابعة، فإنك توافق على",
    terms: "الشروط والأحكام",
    and: "و",
    privacy: "سياسة الخصوصية",
  },
} as const;

// ---------------------------------------------------------------------------
// Role card
// ---------------------------------------------------------------------------

interface RoleCardProps {
  active: boolean;
  title: string;
  desc: string;
  icon: React.ReactNode;
  iconActiveCls: string;
  iconIdleCls: string;
  onClick: () => void;
}

function RoleCard({ active, title, desc, icon, iconActiveCls, iconIdleCls, onClick }: RoleCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={[
        "group relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        "min-h-[44px]",
        active
          ? "bg-indigo-50/80 shadow-[0_0_0_2px_#4F46E5,0_4px_20px_rgba(79,70,229,0.18)]"
          : "bg-white/50 ring-1 ring-slate-200/80 hover:bg-white/70 hover:ring-slate-300/90 hover:shadow-sm",
      ].join(" ")}
    >
      <div
        className={[
          "inline-flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-200",
          active ? iconActiveCls : iconIdleCls,
        ].join(" ")}
      >
        {icon}
      </div>
      <div className="mt-3">
        <div className={["text-sm font-semibold", active ? "text-indigo-900" : "text-slate-800"].join(" ")}>
          {title}
        </div>
        <div className="mt-1 text-xs leading-relaxed text-slate-500">{desc}</div>
      </div>
      {active ? (
        <div className="absolute right-3.5 top-3.5 h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_0_2.5px_rgba(79,70,229,0.22)]" />
      ) : null}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Inner content (needs useSearchParams — must be in Suspense)
// ---------------------------------------------------------------------------

function AuthGatewayContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const locale = normalizeLocale(useLocale());
  const copy = COPY[locale];
  const isRtl = locale === "ar";

  const initialMode = useMemo<AuthMode>(() => readMode(sp.get("mode")), [sp]);
  const initialRole = useMemo<AuthRoleUi>(() => readRole(sp.get("role")), [sp]);

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [role, setRole] = useState<AuthRoleUi>(initialRole);

  function go() {
    const qs = new URLSearchParams({ role });
    const nextRaw = sp.get("next");
    if (nextRaw) qs.set("next", nextRaw);
    router.push(`/${mode}?${qs.toString()}`);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-[480px]"
    >
      {/* ── Elevated auth card ── */}
      <div className="overflow-hidden rounded-3xl border border-white/70 bg-[#fffdf9]/[0.95] shadow-[0_40px_120px_rgba(5,10,28,0.38),0_0_0_1px_rgba(255,255,255,0.25)] backdrop-blur-2xl">
        {/* Card body */}
        <div className="p-6 sm:p-8">

          {/* Header */}
          <header className="mb-5">
            <h1 className="text-[27px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 sm:text-[1.85rem]">
              {mode === "login" ? copy.titleLogin : copy.titleSignup}
            </h1>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-500">
              {mode === "login" ? copy.subtitleLogin : copy.subtitleSignup}
            </p>
          </header>

          <div className="space-y-4">
            {/* Mode tabs */}
            <div className="flex w-full border-b border-slate-200">
              {(["login", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={[
                    "relative flex h-10 flex-1 items-center justify-center px-4 text-sm font-semibold transition-colors duration-150",
                    mode === m
                      ? "text-indigo-600 after:absolute after:bottom-0 after:left-4 after:right-4 after:h-[2px] after:rounded-full after:bg-indigo-600"
                      : "text-slate-400 hover:text-slate-700",
                  ].join(" ")}
                >
                  {m === "login" ? copy.tabLogin : copy.tabSignup}
                </button>
              ))}
            </div>

            {/* Role radiogroup */}
            <div
              role="radiogroup"
              aria-label={copy.selectRole}
              className="grid gap-3 sm:grid-cols-2"
            >
              <RoleCard
                active={role === "customer"}
                title={copy.customer}
                desc={copy.customerDesc}
                icon={<User2 className="h-5 w-5" />}
                iconActiveCls="bg-indigo-100 text-indigo-700"
                iconIdleCls="bg-slate-100 text-slate-500 group-hover:bg-indigo-50/80 group-hover:text-indigo-600"
                onClick={() => setRole("customer")}
              />
              <RoleCard
                active={role === "vendor"}
                title={copy.vendor}
                desc={copy.vendorDesc}
                icon={<Building2 className="h-5 w-5" />}
                iconActiveCls="bg-amber-100 text-amber-700"
                iconIdleCls="bg-slate-100 text-slate-500 group-hover:bg-amber-50/80 group-hover:text-amber-600"
                onClick={() => setRole("vendor")}
              />
            </div>

            {/* CTA */}
            <motion.button
              type="button"
              onClick={go}
              whileTap={{ scale: 0.98 }}
              className="site-cta-primary inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2"
            >
              {mode === "login" ? copy.continueLogin : copy.continueSignup}
              <ArrowRight className={isRtl ? "h-4 w-4 rotate-180 text-indigo-100" : "h-4 w-4 text-indigo-100"} />
            </motion.button>

            {/* Footnote */}
            <div className="text-center text-xs text-slate-500">
              {mode === "login" ? (
                <>
                  {copy.footnoteLoginPrefix}{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="font-semibold text-indigo-700 hover:underline"
                  >
                    {copy.footnoteLoginAction}
                  </button>
                </>
              ) : (
                <>
                  {copy.footnoteSignupPrefix}{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="font-semibold text-indigo-700 hover:underline"
                  >
                    {copy.footnoteSignupAction}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Card footer — terms */}
        <div className="border-t border-slate-100 px-6 py-3 sm:px-8">
          <p className="text-center text-[11px] leading-relaxed text-slate-400">
            {copy.termsPrefix}{" "}
            <Link href="/terms" className="font-semibold text-slate-600 hover:text-indigo-700">
              {copy.terms}
            </Link>{" "}
            {copy.and}{" "}
            <Link href="/privacy" className="font-semibold text-slate-600 hover:text-indigo-700">
              {copy.privacy}
            </Link>
            .
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function GatewayLoading() {
  return (
    <div className="w-full max-w-[480px]">
      <div className="animate-pulse overflow-hidden rounded-3xl border border-white/50 bg-white/90 shadow-[0_40px_100px_rgba(5,10,28,0.32)] backdrop-blur-2xl">
        <div className="p-6 sm:p-8">
          <div className="h-7 w-40 rounded-xl bg-slate-200/80" />
          <div className="mt-2 h-4 w-56 rounded-lg bg-slate-100" />
          <div className="mt-5 h-[2px] w-full rounded bg-slate-100" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="h-28 rounded-2xl bg-slate-100" />
            <div className="h-28 rounded-2xl bg-slate-100" />
          </div>
          <div className="mt-4 h-11 rounded-2xl bg-slate-200" />
        </div>
        <div className="border-t border-slate-100 px-8 py-3">
          <div className="mx-auto h-3 w-52 rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AuthGatewayPage() {
  return (
    <main className="relative min-h-dvh w-full overflow-hidden">

      {/* ── Layer 1: Dubai collage background ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <DubaiAuthCollageBackground />
      </div>

      {/* ── Layer 2: Readability overlays ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1]">
        {/* Light global dim — images remain vivid */}
        <div className="absolute inset-0 bg-slate-950/[0.18]" />
        {/* Radial vignette — gentle brightening at center, darkening at edges */}
        <div className="absolute inset-0 bg-[radial-gradient(65%_70%_at_50%_50%,rgba(15,23,42,0.06)_0%,rgba(15,23,42,0.44)_100%)]" />
        {/* Top header fade — legibility for Back to home pill */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-950/22 to-transparent" />
        {/* Bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/26 to-transparent" />
      </div>

      {/* ── Layer 3: Content ── */}
      <div className="relative z-[2] flex min-h-dvh flex-col">

        {/* Back to home — top-left chrome */}
        <div className="flex-none px-5 pt-5 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-2 text-[12.5px] font-semibold text-white/85 backdrop-blur-sm ring-1 ring-white/18 transition hover:bg-white/20 hover:text-white"
          >
            <span aria-hidden="true" className="text-[11px]">&#8592;</span>
            Back to home
          </Link>
        </div>

        {/* Card — centered in remaining space */}
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
          <Suspense fallback={<GatewayLoading />}>
            <AuthGatewayContent />
          </Suspense>
        </div>

      </div>
    </main>
  );
}
