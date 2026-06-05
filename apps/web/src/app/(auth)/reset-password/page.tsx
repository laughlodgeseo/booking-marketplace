"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { AuthCard } from "@/components/auth/AuthCard";
import { resetPassword } from "@/lib/auth/authApi";
import { normalizeLocale } from "@/lib/i18n/config";

const COPY = {
  en: {
    loadingTitle: "Loading reset form",
    loadingSubtitle: "Preparing password reset...",
    title: "Set a new password",
    subtitle: "Choose a new secure password for your account",
    invalidTitle: "Reset link invalid",
    invalidSubtitle: "This password reset link is missing or malformed.",
    invalidBody:
      "Please request a new password reset link and try again. Reset links expire after 30 minutes and can only be used once.",
    requestNewLink: "Request new link",
    updated: "Your password has been updated.",
    continueToLogin: "Continue to sign in",
    passwordLabel: "New password",
    passwordPlaceholder: "At least 8 characters",
    confirmLabel: "Confirm password",
    confirmPlaceholder: "Repeat your new password",
    updateFailed: "Reset failed",
    updating: "Updating...",
    updatePassword: "Update password",
    backToLogin: "Back to login",
    passwordTooShort: "Password must be at least 8 characters",
    passwordMismatch: "Passwords do not match",
    genericError: "This reset link is invalid or has already expired. Please request a new one.",
  },
  ar: {
    loadingTitle: "جارٍ تحميل نموذج إعادة التعيين",
    loadingSubtitle: "يتم تجهيز إعادة تعيين كلمة المرور...",
    title: "تعيين كلمة مرور جديدة",
    subtitle: "اختر كلمة مرور جديدة وآمنة لحسابك",
    invalidTitle: "رابط إعادة التعيين غير صالح",
    invalidSubtitle: "رابط إعادة تعيين كلمة المرور هذا مفقود أو غير صحيح.",
    invalidBody:
      "يرجى طلب رابط إعادة تعيين جديد والمحاولة مرة أخرى. تنتهي صلاحية الروابط بعد 30 دقيقة ولا يمكن استخدامها إلا مرة واحدة.",
    requestNewLink: "طلب رابط جديد",
    updated: "تم تحديث كلمة المرور بنجاح.",
    continueToLogin: "المتابعة إلى تسجيل الدخول",
    passwordLabel: "كلمة المرور الجديدة",
    passwordPlaceholder: "8 أحرف على الأقل",
    confirmLabel: "تأكيد كلمة المرور",
    confirmPlaceholder: "أعد إدخال كلمة المرور الجديدة",
    updateFailed: "فشلت إعادة التعيين",
    updating: "جارٍ التحديث...",
    updatePassword: "تحديث كلمة المرور",
    backToLogin: "العودة إلى تسجيل الدخول",
    passwordTooShort: "يجب أن تكون كلمة المرور 8 أحرف على الأقل",
    passwordMismatch: "كلمتا المرور غير متطابقتين",
    genericError: "رابط إعادة التعيين هذا غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد.",
  },
} as const;

const INPUT_CLASS =
  "h-12 w-full rounded-xl border border-indigo-100/85 bg-[linear-gradient(180deg,rgba(248,242,232,0.95),rgba(240,233,220,0.74))] px-4 text-[16px] text-primary shadow-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-200/30";

export default function ResetPasswordPage() {
  const locale = normalizeLocale(useLocale());
  const copy = COPY[locale];

  return (
    <Suspense
      fallback={
        <AuthCard title={copy.loadingTitle} subtitle={copy.loadingSubtitle}>
          <div className="h-20" />
        </AuthCard>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = normalizeLocale(useLocale());
  const copy = COPY[locale];

  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show an explicit invalid-link state when the token is absent from the URL.
  if (!token) {
    return (
      <AuthCard title={copy.invalidTitle} subtitle={copy.invalidSubtitle}>
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-secondary">{copy.invalidBody}</p>
          <Link
            href="/forgot-password"
            className="site-cta-primary flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-text-invert"
          >
            {copy.requestNewLink}
          </Link>
          <div className="text-center">
            <Link href="/login" className="text-sm font-semibold text-brand hover:underline">
              {copy.backToLogin}
            </Link>
          </div>
        </div>
      </AuthCard>
    );
  }

  function validate(): string | null {
    if (newPassword.length < 8) return copy.passwordTooShort;
    if (newPassword !== confirmPassword) return copy.passwordMismatch;
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      // Token is passed only in the request body — never stored in
      // localStorage/sessionStorage or logged.
      await resetPassword({ token, newPassword });
      setDone(true);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      // Surface a generic message so error details don't leak token info.
      setError(raw || copy.genericError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title={copy.title} subtitle={copy.subtitle}>
      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-secondary">{copy.updated}</p>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="site-cta-primary h-11 w-full rounded-xl text-sm font-semibold text-text-invert"
          >
            {copy.continueToLogin}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-secondary/70">
              {copy.passwordLabel}
            </span>
            <input
              type="password"
              required
              autoComplete="new-password"
              placeholder={copy.passwordPlaceholder}
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={INPUT_CLASS}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-secondary/70">
              {copy.confirmLabel}
            </span>
            <input
              type="password"
              required
              autoComplete="new-password"
              placeholder={copy.confirmPlaceholder}
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={INPUT_CLASS}
            />
          </label>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="site-cta-primary h-11 w-full rounded-xl text-sm font-semibold text-text-invert disabled:opacity-60"
          >
            {submitting ? copy.updating : copy.updatePassword}
          </button>

          <div className="text-center">
            <Link href="/login" className="text-sm font-semibold text-brand hover:underline">
              {copy.backToLogin}
            </Link>
          </div>
        </form>
      )}
    </AuthCard>
  );
}
