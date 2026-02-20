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
    subtitle: "Use your reset token to create a new password",
    updated: "Your password has been updated.",
    continueToLogin: "Continue to login",
    tokenPlaceholder: "Reset token",
    passwordPlaceholder: "New password",
    updateFailed: "Reset failed",
    updating: "Updating...",
    updatePassword: "Update password",
    backToLogin: "Back to login",
  },
  ar: {
    loadingTitle: "جارٍ تحميل نموذج إعادة التعيين",
    loadingSubtitle: "يتم تجهيز إعادة تعيين كلمة المرور...",
    title: "تعيين كلمة مرور جديدة",
    subtitle: "استخدم رمز إعادة التعيين لإنشاء كلمة مرور جديدة",
    updated: "تم تحديث كلمة المرور بنجاح.",
    continueToLogin: "المتابعة إلى تسجيل الدخول",
    tokenPlaceholder: "رمز إعادة التعيين",
    passwordPlaceholder: "كلمة المرور الجديدة",
    updateFailed: "فشلت إعادة التعيين",
    updating: "جارٍ التحديث...",
    updatePassword: "تحديث كلمة المرور",
    backToLogin: "العودة إلى تسجيل الدخول",
  },
} as const;

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

  const initialToken = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await resetPassword({ token, newPassword });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.updateFailed);
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
            className="h-11 w-full rounded-xl bg-brand text-sm font-medium text-text-invert shadow-brand-soft hover:bg-brand-hover"
          >
            {copy.continueToLogin}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            required
            placeholder={copy.tokenPlaceholder}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="premium-input h-12 w-full rounded-xl px-4 text-[16px] focus:outline-none"
          />

          <input
            type="password"
            required
            autoComplete="new-password"
            placeholder={copy.passwordPlaceholder}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="premium-input h-12 w-full rounded-xl px-4 text-[16px] focus:outline-none"
          />

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="h-11 w-full rounded-xl bg-brand text-sm font-medium text-text-invert shadow-brand-soft hover:bg-brand-hover disabled:opacity-60"
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
