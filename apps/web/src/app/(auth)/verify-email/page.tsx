"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { logout, requestEmailVerificationOtp, verifyEmailOtp } from "@/lib/auth/authApi";

type UiRole = "customer" | "vendor";

function safeNextPath(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  return raw;
}

function readRole(raw: string | null): UiRole {
  return raw === "vendor" ? "vendor" : "customer";
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <AuthCard
          title="Verify email"
          subtitle="Preparing verification..."
          eyebrow="Security"
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

  const role = useMemo<UiRole>(() => readRole(searchParams.get("role")), [searchParams]);
  const nextPath = useMemo(() => safeNextPath(searchParams.get("next")), [searchParams]);
  const email = useMemo(() => searchParams.get("email")?.trim() || "", [searchParams]);

  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    let alive = true;

    async function bootstrap() {
      setBusy("Sending verification code...");
      setError(null);
      try {
        await requestEmailVerificationOtp();
        if (!alive) return;
        setOk("Verification code sent. Check your email.");
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Failed to request verification code.");
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
      setError("Enter the 6-digit code.");
      return;
    }

    setBusy("Verifying code...");
    setError(null);
    setOk(null);
    try {
      await verifyEmailOtp(code);
      setOk("Email verified successfully.");
      await logout();
      const qs = new URLSearchParams({ role, next: nextPath });
      router.replace(`/login?${qs.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired code.");
    } finally {
      setBusy(null);
    }
  }

  async function resend() {
    setBusy("Resending code...");
    setError(null);
    setOk(null);
    try {
      await requestEmailVerificationOtp();
      setOk("A new code has been sent.");
      setCooldown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AuthCard
      title="Verify your email"
      subtitle="Enter the 6-digit code we sent to your inbox"
      eyebrow="Security"
      showBackHome
      footnote={
        <div className="text-center text-xs text-secondary">
          Already verified?{" "}
          <Link href={`/login?${new URLSearchParams({ role, next: nextPath }).toString()}`} className="font-semibold text-brand hover:underline">
            Go to login
          </Link>
        </div>
      }
    >
      <div className="mb-4 text-xs text-secondary">
        {email ? `Email: ${email}` : "Use the code from your email."}
      </div>

      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <div className="mb-1.5 text-xs font-semibold text-primary">One-time code</div>
          <input
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            placeholder="000000"
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
          {busy === "Verifying code..." ? "Verifying..." : "Verify email"}
        </button>

        <button
          type="button"
          onClick={() => void resend()}
          disabled={busy !== null || cooldown > 0}
          className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-line/80 bg-surface px-5 text-sm font-semibold text-primary hover:bg-warm-alt disabled:opacity-60"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </form>
    </AuthCard>
  );
}
