"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Building2, User2, ArrowRight } from "lucide-react";
import { useLocale } from "next-intl";
import { AuthCard } from "@/components/auth/AuthCard";
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
    titleSignup: "Create your secure account",
    subtitleLogin: "Select your role to continue securely.",
    subtitleSignup: "Select an account type to begin onboarding.",
    eyebrow: "Account access",
    footnoteLoginPrefix: "New here?",
    footnoteLoginAction: "Create an account",
    footnoteSignupPrefix: "Already have an account?",
    footnoteSignupAction: "Sign in",
    tabLogin: "Log in",
    tabSignup: "Sign up",
    customer: "Customer",
    customerDesc: "Book stays, manage trips, and track refunds.",
    vendor: "Vendor",
    vendorDesc: "List homes, manage availability, and operate reservations.",
    continueLogin: "Continue to sign in",
    continueSignup: "Continue to account setup",
    loadingTitle: "Loading access",
    loadingSubtitle: "Preparing account gateway...",
  },
  ar: {
    titleLogin: "مرحباً بعودتك",
    titleSignup: "أنشئ حسابك الآمن",
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
    customerDesc: "احجز الإقامات وأدر الرحلات وتابع طلبات الاسترداد.",
    vendor: "مزوّد",
    vendorDesc: "أضف الوحدات وأدر التوافر ونفّذ الحجوزات تشغيلياً.",
    continueLogin: "المتابعة إلى تسجيل الدخول",
    continueSignup: "المتابعة إلى إعداد الحساب",
    loadingTitle: "جارٍ تحميل الوصول",
    loadingSubtitle: "يتم تجهيز بوابة الحساب...",
  },
} as const;

function AuthGatewayContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const locale = normalizeLocale(useLocale());
  const copy = COPY[locale];

  const initialMode = useMemo<AuthMode>(() => readMode(sp.get("mode")), [sp]);
  const initialRole = useMemo<AuthRoleUi>(() => readRole(sp.get("role")), [sp]);

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [role, setRole] = useState<AuthRoleUi>(initialRole);

  const title = mode === "login" ? copy.titleLogin : copy.titleSignup;
  const subtitle =
    mode === "login" ? copy.subtitleLogin : copy.subtitleSignup;
  const arrowClass = locale === "ar" ? "h-4 w-4 rotate-180 text-indigo-100" : "h-4 w-4 text-indigo-100";

  function go() {
    const qs = new URLSearchParams({ role });
    router.push(`/${mode}?${qs.toString()}`);
  }

  return (
    <AuthCard
      title={title}
      subtitle={subtitle}
      eyebrow={copy.eyebrow}
      showBackHome
      width="lg"
      footnote={
        <div className="text-center text-xs text-secondary">
          {mode === "login" ? (
            <>
              {copy.footnoteLoginPrefix}{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="font-semibold text-[#4F46E5] hover:underline"
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
                className="font-semibold text-[#4F46E5] hover:underline"
              >
                {copy.footnoteSignupAction}
              </button>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        {/* Mode switch */}
        <div className="flex w-full border-b border-line">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={[
              "relative flex h-11 flex-1 items-center justify-center px-4 text-sm font-semibold transition",
              mode === "login"
                ? "text-[#4F46E5] after:absolute after:bottom-0 after:left-4 after:right-4 after:h-[2px] after:rounded-full after:bg-[#4F46E5]"
                : "text-secondary hover:text-primary",
            ].join(" ")}
          >
            {copy.tabLogin}
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={[
              "relative flex h-11 flex-1 items-center justify-center px-4 text-sm font-semibold transition",
              mode === "signup"
                ? "text-[#4F46E5] after:absolute after:bottom-0 after:left-4 after:right-4 after:h-[2px] after:rounded-full after:bg-[#4F46E5]"
                : "text-secondary hover:text-primary",
            ].join(" ")}
          >
            {copy.tabSignup}
          </button>
        </div>

        {/* Role cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          <RoleCard
            active={role === "customer"}
            title={copy.customer}
            desc={copy.customerDesc}
            icon={<User2 className="h-5 w-5" />}
            onClick={() => setRole("customer")}
          />
          <RoleCard
            active={role === "vendor"}
            title={copy.vendor}
            desc={copy.vendorDesc}
            icon={<Building2 className="h-5 w-5" />}
            onClick={() => setRole("vendor")}
          />
        </div>

        <motion.button
          type="button"
          onClick={go}
          whileTap={{ scale: 0.98 }}
          className="site-cta-primary inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30"
        >
          {mode === "login" ? copy.continueLogin : copy.continueSignup}
          <ArrowRight className={arrowClass} />
        </motion.button>
      </div>
    </AuthCard>
  );
}

export default function AuthGatewayPage() {
  const locale = normalizeLocale(useLocale());
  const copy = COPY[locale];

  return (
    <Suspense
      fallback={
        <AuthCard
          title={copy.loadingTitle}
          subtitle={copy.loadingSubtitle}
          eyebrow={copy.eyebrow}
          showBackHome
          width="lg"
        >
          <div className="h-20" />
        </AuthCard>
      }
    >
      <AuthGatewayContent />
    </Suspense>
  );
}

function RoleCard(props: {
  active: boolean;
  title: string;
  desc: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={[
        "group relative overflow-hidden rounded-2xl bg-surface/70 p-4 text-left ring-1 ring-line/55 transition",
        "hover:bg-surface hover:shadow-card",
        props.active ? "ring-2 ring-[#4F46E5]" : "",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl",
            props.active
              ? "bg-white text-indigo-700 ring-1 ring-indigo-300/70"
              : "bg-dark-1/5 text-primary",
          ].join(" ")}
        >
          {props.icon}
        </div>

        <div className="min-w-0">
          <div className="text-sm font-semibold text-primary">{props.title}</div>
          <div className="mt-1 text-xs leading-relaxed text-secondary">
            {props.desc}
          </div>
        </div>
      </div>

      {/* subtle sheen */}
      <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span className="absolute -left-24 top-0 h-full w-24 rotate-12 bg-surface/45 blur-xl" />
      </span>
    </button>
  );
}
