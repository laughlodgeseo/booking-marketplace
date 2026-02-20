"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { AuthCard } from "@/components/auth/AuthCard";
import { logout, requestEmailVerificationOtp, verifyEmailOtp } from "@/lib/auth/authApi";
import { normalizeLocale } from "@/lib/i18n/config";

type UiRole = "customer" | "vendor";
type BusyState = "sending" | "verifying" | "resending" | null;

function safeNextPath(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  return raw;
}

function readRole(raw: string | null): UiRole {
  return raw === "vendor" ? "vendor" : "customer";
}

const COPY = {
  en: {
    fallbackTitle: "Verify email",
    fallbackSubtitle: "Preparing verification...",
    fallbackEyebrow: "Security",
    title: "Verify your email",
    subtitle: "Enter the 6-digit code we sent to your inbox",
    eyebrow: "Security",
    alreadyVerified: "Already verified?",
    goToLogin: "Go to login",
    emailLabel: (email: string) => (email ? `Email: ${email}` : "Use the code from your email."),
    oneTimeCode: "One-time code",
    codePlaceholder: "000000",
    enterSixDigits: "Enter the 6-digit code.",
    sendingCode: "Sending verification code...",
    sentCode: "Verification code sent. Check your email.",
    sendCodeFailed: "Failed to request verification code.",
    verifyingCode: "Verifying code...",
    verifiedSuccess: "Email verified successfully.",
    invalidCode: "Invalid or expired code.",
    resendingCode: "Resending code...",
    resentSuccess: "A new code has been sent.",
    resendFailed: "Failed to resend code.",
    verifying: "Verifying...",
    verifyEmail: "Verify email",
    resendIn: (seconds: number) => `Resend in ${seconds}s`,
    resendCode: "Resend code",
  },
  ar: {
    fallbackTitle: "التحقق من البريد الإلكتروني",
    fallbackSubtitle: "يتم تجهيز التحقق...",
    fallbackEyebrow: "الأمان",
    title: "تحقق من بريدك الإلكتروني",
    subtitle: "أدخل رمز التحقق المكوّن من 6 أرقام الذي أرسلناه إلى بريدك",
    eyebrow: "الأمان",
    alreadyVerified: "تم التحقق بالفعل؟",
    goToLogin: "انتقل إلى تسجيل الدخول",
    emailLabel: (email: string) => (email ? `البريد: ${email}` : "استخدم الرمز المرسل إلى بريدك الإلكتروني."),
    oneTimeCode: "رمز لمرة واحدة",
    codePlaceholder: "000000",
    enterSixDigits: "أدخل الرمز المكوّن من 6 أرقام.",
    sendingCode: "جارٍ إرسال رمز التحقق...",
    sentCode: "تم إرسال رمز التحقق. تحقق من بريدك الإلكتروني.",
    sendCodeFailed: "تعذر طلب رمز التحقق.",
    verifyingCode: "جارٍ التحقق من الرمز...",
    verifiedSuccess: "تم التحقق من البريد الإلكتروني بنجاح.",
    invalidCode: "الرمز غير صالح أو منتهي الصلاحية.",
    resendingCode: "جارٍ إعادة إرسال الرمز...",
    resentSuccess: "تم إرسال رمز جديد.",
    resendFailed: "تعذر إعادة إرسال الرمز.",
    verifying: "جارٍ التحقق...",
    verifyEmail: "تحقق من البريد الإلكتروني",
    resendIn: (seconds: number) => `إعادة الإرسال خلال ${seconds}ث`,
    resendCode: "إعادة إرسال الرمز",
  },
} as const;

export default function VerifyEmailPage() {
  const locale = normalizeLocale(useLocale());
  const copy = COPY[locale];

  return (
    <Suspense
      fallback={
        <AuthCard
          title={copy.fallbackTitle}
          subtitle={copy.fallbackSubtitle}
          eyebrow={copy.fallbackEyebrow}
          showBackHome
        >
          <div className="h-20" />
        </AuthCard>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = normalizeLocale(useLocale());
  const copy = COPY[locale];

  const role = useMemo<UiRole>(() => readRole(searchParams.get("role")), [searchParams]);
  const nextPath = useMemo(() => safeNextPath(searchParams.get("next")), [searchParams]);
  const email = useMemo(() => searchParams.get("email")?.trim() || "", [searchParams]);

  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState<BusyState>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    let alive = true;

    async function bootstrap() {
      setBusy("sending");
      setError(null);
      try {
        await requestEmailVerificationOtp();
        if (!alive) return;
        setOk(copy.sentCode);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : copy.sendCodeFailed);
      } finally {
        if (!alive) return;
        setBusy(null);
      }
    }

    void bootstrap();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = otp.replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) {
      setError(copy.enterSixDigits);
      return;
    }

    setBusy("verifying");
    setError(null);
    setOk(null);
    try {
      await verifyEmailOtp(code);
      setOk(copy.verifiedSuccess);
      await logout();
      const qs = new URLSearchParams({ role, next: nextPath });
      router.replace(`/login?${qs.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.invalidCode);
    } finally {
      setBusy(null);
    }
  }

  async function resend() {
    setBusy("resending");
    setError(null);
    setOk(null);
    try {
      await requestEmailVerificationOtp();
      setOk(copy.resentSuccess);
      setCooldown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.resendFailed);
    } finally {
      setBusy(null);
    }
  }

  return (
    <AuthCard
      title={copy.title}
      subtitle={copy.subtitle}
      eyebrow={copy.eyebrow}
      showBackHome
      footnote={
        <div className="text-center text-xs text-secondary">
          {copy.alreadyVerified}{" "}
          <Link href={`/login?${new URLSearchParams({ role, next: nextPath }).toString()}`} className="font-semibold text-brand hover:underline">
            {copy.goToLogin}
          </Link>
        </div>
      }
    >
      <div className="mb-4 text-xs text-secondary">
        {copy.emailLabel(email)}
      </div>

      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <div className="mb-1.5 text-xs font-semibold text-primary">{copy.oneTimeCode}</div>
          <input
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            placeholder={copy.codePlaceholder}
            className="premium-input h-12 w-full rounded-2xl px-4 text-center text-[16px] font-semibold tracking-[0.3em] text-primary shadow-sm outline-none placeholder:text-muted"
          />
        </label>

        {error ? (
          <div className="rounded-2xl bg-danger/12 px-4 py-3 text-sm text-danger ring-1 ring-danger/30">
            {error}
          </div>
        ) : null}

        {ok ? (
          <div className="rounded-2xl bg-success/12 px-4 py-3 text-sm text-success ring-1 ring-success/30">
            {ok}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={busy !== null || otp.length !== 6}
          className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-brand px-5 text-sm font-semibold text-text-invert shadow-brand-soft hover:bg-brand-hover disabled:opacity-60"
        >
          {busy === "verifying" ? copy.verifying : copy.verifyEmail}
        </button>

        <button
          type="button"
          onClick={() => void resend()}
          disabled={busy !== null || cooldown > 0}
          className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-line/80 bg-surface px-5 text-sm font-semibold text-primary hover:bg-warm-alt disabled:opacity-60"
        >
          {cooldown > 0 ? copy.resendIn(cooldown) : copy.resendCode}
        </button>
      </form>
    </AuthCard>
  );
}
