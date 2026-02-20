"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useMemo, useState } from "react";
import { requestPasswordReset } from "@/lib/auth/authApi";
import type { AuthUiRole } from "@/components/auth/authFlow";
import { normalizeLocale } from "@/lib/i18n/config";

interface AuthPanelForgotProps {
  role: AuthUiRole;
  nextPath: string;
}

const INPUT_CLASS =
  "h-12 w-full rounded-[12px] border border-slate-200 bg-white px-3.5 text-[16px] text-slate-900 shadow-[0_2px_8px_rgba(15,23,42,0.06)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-indigo-300/25 sm:px-4 lg:h-auto lg:py-3 lg:text-[14px]";

const COPY = {
  en: {
    requestFailed: "Request failed",
    successMessage: (email: string) =>
      `If an account exists for ${email}, you will receive password reset instructions shortly.`,
    debugHint: (error: string) => `Note: if no email arrives, check your spam folder. (Debug: ${error})`,
    backToLogin: "Back to login",
    intro: "Enter your email and we will send reset instructions.",
    email: "Email",
    emailPlaceholder: "you@example.com",
    sending: "Sending...",
    sendInstructions: "Send reset instructions",
  },
  ar: {
    requestFailed: "تعذر إرسال الطلب",
    successMessage: (email: string) =>
      `إذا كان هناك حساب مرتبط بـ ${email} فستصلك تعليمات إعادة التعيين قريباً.`,
    debugHint: (error: string) => `ملاحظة: إذا لم تصلك رسالة، تحقق من البريد غير الهام. (تفاصيل: ${error})`,
    backToLogin: "العودة لتسجيل الدخول",
    intro: "أدخل بريدك الإلكتروني وسنرسل تعليمات إعادة التعيين.",
    email: "البريد الإلكتروني",
    emailPlaceholder: "you@example.com",
    sending: "جارٍ الإرسال...",
    sendInstructions: "إرسال تعليمات إعادة التعيين",
  },
} as const;

export function AuthPanelForgot({ role, nextPath }: AuthPanelForgotProps) {
  const locale = normalizeLocale(useLocale());
  const copy = COPY[locale];
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginHref = useMemo(() => {
    const qs = new URLSearchParams({ role, next: nextPath, dir: "back" });
    return `/login?${qs.toString()}`;
  }, [role, nextPath]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await requestPasswordReset({ email });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.requestFailed);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <AnimatePresence mode="wait" initial={false}>
        {submitted ? (
          <motion.div
            key="forgot-success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-4"
          >
            <p className="rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {copy.successMessage(email)}
            </p>

            {error ? (
              <p className="text-xs text-slate-500">
                {copy.debugHint(error)}
              </p>
            ) : null}

            <Link
              href={loginHref}
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#2F3EA3] px-5 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(47,62,163,0.30)] transition-colors duration-150 hover:bg-[#27358F] lg:h-auto lg:py-3.5"
            >
              {copy.backToLogin}
            </Link>
          </motion.div>
        ) : (
          <motion.form
            key="forgot-form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
          >
            <p className="text-sm text-slate-600">
              {copy.intro}
            </p>

            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:text-[11px]">{copy.email}</span>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder={copy.emailPlaceholder}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={INPUT_CLASS}
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#2F3EA3] px-5 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(47,62,163,0.30)] transition-colors duration-150 hover:bg-[#27358F] disabled:cursor-not-allowed disabled:opacity-65 lg:h-auto lg:py-3.5"
            >
              {submitting ? copy.sending : copy.sendInstructions}
            </button>

            <div className="pt-1 text-center">
              <Link href={loginHref} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline">
                {copy.backToLogin}
              </Link>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
