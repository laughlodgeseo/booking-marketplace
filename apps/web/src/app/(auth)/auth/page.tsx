"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Building2, User2, ArrowRight, LockKeyhole } from "lucide-react";
import { useLocale } from "next-intl";
import { normalizeLocale } from "@/lib/i18n/config";

type AuthMode = "login" | "signup";
type AuthRoleUi = "customer" | "vendor";

function readMode(raw: string | null): AuthMode {
  return raw === "signup" ? "signup" : "login";
}

function readRole(raw: string | null): AuthRoleUi {
  return raw === "vendor" ? "vendor" : "customer";
}

const COPY = {
  en: {
    titleLogin: "Welcome back",
    titleSignup: "Create your account",
    subtitleLogin: "Select your role to continue securely.",
    subtitleSignup: "Select an account type to begin.",
    eyebrow: "Account access",
    footnoteLoginPrefix: "New here?",
    footnoteLoginAction: "Create an account",
    footnoteSignupPrefix: "Already have an account?",
    footnoteSignupAction: "Sign in",
    tabLogin: "Log in",
    tabSignup: "Sign up",
    customer: "Customer",
    customerDesc: "Book stays, manage trips, documents, refunds, and support.",
    vendor: "Vendor",
    vendorDesc: "List homes, manage availability, bookings, pricing, and operations.",
    continueLogin: "Continue to sign in",
    continueSignup: "Continue to account setup",
    backHome: "Back to home",
    termsPrefix: "By continuing, you agree to our",
    terms: "Terms & Conditions",
    and: "and",
    privacy: "Privacy Policy",
    selectRole: "Select account type",
  },
  ar: {
    titleLogin: "مرحباً بعودتك",
    titleSignup: "أنشئ حسابك",
    subtitleLogin: "اختر دورك للمتابعة بشكل آمن.",
    subtitleSignup: "اختر نوع الحساب لبدء التسجيل.",
    eyebrow: "وصول الحساب",
    footnoteLoginPrefix: "جديد هنا؟",
    footnoteLoginAction: "أنشئ حساباً",
    footnoteSignupPrefix: "لديك حساب بالفعل؟",
    footnoteSignupAction: "تسجيل الدخول",
    tabLogin: "تسجيل الدخول",
    tabSignup: "إنشاء حساب",
    customer: "عميل",
    customerDesc: "احجز الإقامات وأدر الرحلات والمستندات والاسترداد والدعم.",
    vendor: "مزوّد",
    vendorDesc: "أضف الوحدات وأدر التوافر والحجوزات والأسعار والعمليات.",
    continueLogin: "المتابعة إلى تسجيل الدخول",
    continueSignup: "المتابعة إلى إعداد الحساب",
    backHome: "العودة للرئيسية",
    termsPrefix: "بالمتابعة، فإنك توافق على",
    terms: "الشروط والأحكام",
    and: "و",
    privacy: "سياسة الخصوصية",
    selectRole: "اختر نوع الحساب",
  },
} as const;

// ---------------------------------------------------------------------------
// Role selection card
// ---------------------------------------------------------------------------

interface RoleCardProps {
  active: boolean;
  title: string;
  desc: string;
  icon: React.ReactNode;
  iconActiveBg: string;
  iconIdleBg: string;
  onClick: () => void;
}

function RoleCard({ active, title, desc, icon, iconActiveBg, iconIdleBg, onClick }: RoleCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={[
        "group relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2",
        "min-h-[44px]",
        active
          ? "bg-indigo-50/70 shadow-[0_0_0_2px_#4F46E5,0_4px_20px_rgba(79,70,229,0.14)] ring-0"
          : "bg-surface/60 ring-1 ring-line/55 hover:bg-surface/90 hover:ring-line/75 hover:shadow-sm",
      ].join(" ")}
    >
      <div className={[
        "inline-flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-200",
        active ? iconActiveBg : iconIdleBg,
      ].join(" ")}>
        {icon}
      </div>

      <div className="mt-3">
        <div className={[
          "text-sm font-semibold",
          active ? "text-indigo-900" : "text-primary",
        ].join(" ")}>
          {title}
        </div>
        <div className="mt-1 text-xs leading-relaxed text-secondary/80">{desc}</div>
      </div>

      {active ? (
        <div className="absolute right-3.5 top-3.5 h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_0_2.5px_rgba(79,70,229,0.20)]" />
      ) : null}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Suspense-wrapped inner content
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

  const title = mode === "login" ? copy.titleLogin : copy.titleSignup;
  const subtitle = mode === "login" ? copy.subtitleLogin : copy.subtitleSignup;

  function go() {
    const qs = new URLSearchParams({ role });
    const nextRaw = sp.get("next");
    if (nextRaw) qs.set("next", nextRaw);
    router.push(`/${mode}?${qs.toString()}`);
  }

  return (
    <main className="relative min-h-dvh w-full overflow-hidden">
      {/* ================================================================
          Luxury background layer
          ================================================================ */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        {/* Warm gradient base */}
        <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_0%,rgba(199,210,254,0.28)_0%,rgba(255,250,240,0.00)_65%),linear-gradient(165deg,#faf8f3_0%,#eef0f8_48%,#f8f4ef_100%)]" />

        {/* Subtle dot grid */}
        <div className="absolute inset-0 opacity-[0.028] [background-image:radial-gradient(rgba(79,70,229,0.7)_1px,transparent_1px)] [background-size:22px_22px]" />

        {/* Dubai Marina — top left (desktop) */}
        <div
          className="absolute left-[2%] top-[8%] hidden w-[27%] overflow-hidden rounded-[28px] shadow-[0_24px_64px_rgba(15,23,42,0.20)] ring-1 ring-white/50 lg:block"
          style={{ aspectRatio: "4/3" }}
        >
          <Image
            src="/areas/dubai-marina.webp"
            alt=""
            fill
            priority
            className="object-cover opacity-[0.88]"
            sizes="27vw"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-slate-800/28" />
        </div>

        {/* Downtown Dubai — bottom left (desktop) */}
        <div
          className="absolute bottom-[7%] left-[7%] hidden w-[18%] overflow-hidden rounded-[24px] shadow-[0_18px_48px_rgba(15,23,42,0.16)] ring-1 ring-white/40 lg:block"
          style={{ aspectRatio: "2/3" }}
        >
          <Image
            src="/areas/downtown-dubai.webp"
            alt=""
            fill
            className="object-cover opacity-[0.80]"
            sizes="18vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-white/15" />
        </div>

        {/* Business Bay — top right (desktop) */}
        <div
          className="absolute right-[2%] top-[10%] hidden w-[24%] overflow-hidden rounded-[28px] shadow-[0_22px_58px_rgba(15,23,42,0.18)] ring-1 ring-white/45 lg:block"
          style={{ aspectRatio: "4/3" }}
        >
          <Image
            src="/areas/business-bay.webp"
            alt=""
            fill
            className="object-cover opacity-[0.85]"
            sizes="24vw"
          />
          <div className="absolute inset-0 bg-gradient-to-bl from-white/18 via-transparent to-slate-800/24" />
        </div>

        {/* Ambient glow orbs */}
        <div className="absolute bottom-[18%] right-[5%] h-[35%] w-[18%] rounded-full bg-indigo-200/22 blur-[80px]" />
        <div className="absolute left-[24%] top-[4%] h-[18%] w-[52%] rounded-full bg-amber-100/28 blur-[72px]" />
        <div className="absolute bottom-[8%] left-[30%] h-[22%] w-[40%] rounded-full bg-indigo-50/38 blur-[60px]" />
      </div>

      {/* ================================================================
          Content layer
          ================================================================ */}
      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 pb-10 pt-16 sm:px-6">
        {/* Back to home — top-left corner */}
        <div className="absolute left-4 top-5 sm:left-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary/65 transition-colors hover:text-indigo-700"
          >
            <span aria-hidden="true" className={isRtl ? "rotate-180" : ""}>&#8592;</span>
            {copy.backHome}
          </Link>
        </div>

        {/* The card */}
        <div className="w-full max-w-[480px]">
          <div className="site-surface-card rounded-3xl p-6 shadow-[0_32px_96px_rgba(5,10,28,0.22)] backdrop-blur-xl sm:p-8">

            {/* Card header */}
            <header className="mb-5">
              <div className="site-chip inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold">
                <LockKeyhole className="h-3 w-3 text-indigo-500" />
                {copy.eyebrow}
              </div>
              <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-primary sm:text-[1.9rem]">
                {title}
              </h1>
              <p className="mt-1.5 text-[14px] leading-relaxed text-secondary/85">
                {subtitle}
              </p>
            </header>

            <div className="space-y-5">
              {/* Mode tabs */}
              <div className="flex w-full border-b border-line/60">
                {(["login", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={[
                      "relative flex h-10 flex-1 items-center justify-center px-4 text-sm font-semibold transition",
                      mode === m
                        ? "text-indigo-600 after:absolute after:bottom-0 after:left-4 after:right-4 after:h-[2px] after:rounded-full after:bg-indigo-600"
                        : "text-secondary hover:text-primary",
                    ].join(" ")}
                  >
                    {m === "login" ? copy.tabLogin : copy.tabSignup}
                  </button>
                ))}
              </div>

              {/* Role cards — radio group */}
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
                  iconActiveBg="bg-indigo-100 text-indigo-700"
                  iconIdleBg="bg-slate-100/80 text-slate-500 group-hover:bg-indigo-50/70 group-hover:text-indigo-600"
                  onClick={() => setRole("customer")}
                />
                <RoleCard
                  active={role === "vendor"}
                  title={copy.vendor}
                  desc={copy.vendorDesc}
                  icon={<Building2 className="h-5 w-5" />}
                  iconActiveBg="bg-amber-100/90 text-amber-700"
                  iconIdleBg="bg-slate-100/80 text-slate-500 group-hover:bg-amber-50/70 group-hover:text-amber-600"
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

              {/* Footnote — mode switcher */}
              <div className="text-center text-xs text-secondary">
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

          {/* Terms */}
          <p className="mt-4 text-center text-[11px] leading-relaxed text-secondary/70">
            {copy.termsPrefix}{" "}
            <Link href="/terms" className="font-semibold text-primary hover:text-indigo-800">
              {copy.terms}
            </Link>{" "}
            {copy.and}{" "}
            <Link href="/privacy" className="font-semibold text-primary hover:text-indigo-800">
              {copy.privacy}
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Skeleton shown while useSearchParams resolves
// ---------------------------------------------------------------------------

function GatewayLoading() {
  return (
    <main className="flex min-h-dvh w-full items-center justify-center bg-[#faf8f3] px-4">
      <div className="w-full max-w-[480px]">
        <div className="site-surface-card animate-pulse rounded-3xl p-8 shadow-[0_32px_96px_rgba(5,10,28,0.18)]">
          <div className="h-5 w-24 rounded-full bg-line/60" />
          <div className="mt-4 h-8 w-44 rounded-xl bg-line/40" />
          <div className="mt-2 h-4 w-64 rounded-lg bg-line/30" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="h-28 rounded-2xl bg-line/25" />
            <div className="h-28 rounded-2xl bg-line/25" />
          </div>
          <div className="mt-4 h-11 rounded-2xl bg-line/35" />
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Page export
// ---------------------------------------------------------------------------

export default function AuthGatewayPage() {
  return (
    <Suspense fallback={<GatewayLoading />}>
      <AuthGatewayContent />
    </Suspense>
  );
}
