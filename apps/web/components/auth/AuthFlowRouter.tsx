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
    signupTitle: (roleLabel: string) => `Create ${roleLabel} account`,
    signupSubtitle: "Trusted onboarding for bookings, payments, and profile security.",
    forgotTitle: "Reset your password",
    forgotSubtitle: "Request a secure reset link and regain access quickly.",
    loginTitle: (roleLabel: string) => `Sign in as ${roleLabel}`,
    loginSubtitle: "Secure access to bookings, account settings, and trip operations.",
  },
  ar: {
    roleCustomer: "عميل",
    roleVendor: "مزوّد",
    signupTitle: (roleLabel: string) => `إنشاء حساب ${roleLabel}`,
    signupSubtitle: "انضمام موثوق للحجوزات والمدفوعات وأمان الحساب.",
    forgotTitle: "إعادة تعيين كلمة المرور",
    forgotSubtitle: "اطلب رابطاً آمناً لإعادة التعيين واستعد الوصول بسرعة.",
    loginTitle: (roleLabel: string) => `تسجيل الدخول كـ ${roleLabel}`,
    loginSubtitle: "وصول آمن إلى الحجوزات وإعدادات الحساب وعمليات الرحلة.",
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
