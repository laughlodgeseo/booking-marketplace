"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { AuthPanelForgot } from "@/components/auth/AuthPanelForgot";
import { AuthPanelLogin } from "@/components/auth/AuthPanelLogin";
import { AuthPanelSignup } from "@/components/auth/AuthPanelSignup";
import { AuthSplitScreen } from "@/components/auth/AuthSplitScreen";
import { type AuthFlowPanel, readRole, safeNextPath } from "@/components/auth/authFlow";
import { normalizeLocale } from "@/lib/i18n/config";

interface AuthFlowRouterProps {
  panel: AuthFlowPanel;
}

const HEADER_COPY = {
  en: {
    roleCustomer: "Customer",
    roleVendor: "Vendor",
    signupTitle: (roleLabel: string) => `Create your ${roleLabel} account`,
    signupSubtitle: "Complete secure onboarding for bookings, payments, and account controls.",
    forgotTitle: "Reset your password",
    forgotSubtitle: "Request a secure reset link to restore access quickly.",
    loginTitle: (roleLabel: string) => `${roleLabel} account sign in`,
    loginSubtitle: "Secure access to bookings, account settings, and operational workflows.",
  },
  ar: {
    roleCustomer: "عميل",
    roleVendor: "مزوّد",
    signupTitle: (roleLabel: string) => `أنشئ حساب ${roleLabel}`,
    signupSubtitle: "أكمل تسجيل آمن للحجوزات والمدفوعات وضوابط الحساب.",
    forgotTitle: "إعادة تعيين كلمة المرور",
    forgotSubtitle: "اطلب رابطاً آمناً لإعادة التعيين واستعادة الوصول بسرعة.",
    loginTitle: (roleLabel: string) => `تسجيل الدخول إلى حساب ${roleLabel}`,
    loginSubtitle: "وصول آمن إلى الحجوزات وإعدادات الحساب ومسارات التشغيل.",
  },
} as const;

export function AuthFlowRouter({ panel }: AuthFlowRouterProps) {
  const searchParams = useSearchParams();
  const locale = normalizeLocale(useLocale());
  const copy = HEADER_COPY[locale];

  const role = useMemo(() => readRole(searchParams.get("role") ?? "customer"), [searchParams]);
  const nextPath = useMemo(() => safeNextPath(searchParams.get("next") ?? "/"), [searchParams]);
  const direction: 1 | -1 = (searchParams.get("dir") ?? "forward") === "back" ? -1 : 1;
  const roleLabel = role === "vendor" ? copy.roleVendor : copy.roleCustomer;

  const header =
    panel === "signup"
      ? {
          title: copy.signupTitle(roleLabel),
          subtitle: copy.signupSubtitle,
        }
      : panel === "forgot"
        ? {
            title: copy.forgotTitle,
            subtitle: copy.forgotSubtitle,
          }
        : {
            title: copy.loginTitle(roleLabel),
            subtitle: copy.loginSubtitle,
          };

  return (
    <AuthSplitScreen
      panel={panel}
      direction={direction}
      title={header.title}
      subtitle={header.subtitle}
      panels={{
        login: <AuthPanelLogin role={role} nextPath={nextPath} />,
        signup: <AuthPanelSignup role={role} nextPath={nextPath} />,
        forgot: <AuthPanelForgot role={role} nextPath={nextPath} />,
      }}
    />
  );
}
