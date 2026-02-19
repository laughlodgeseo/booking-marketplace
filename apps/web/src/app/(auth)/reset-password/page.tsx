"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { resetPassword } from "@/lib/auth/authApi";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthCard title="Loading reset form" subtitle="Preparing password reset...">
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
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Set a new password" subtitle="Use your reset token to create a new password">
      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-secondary">Your password has been updated.</p>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="h-11 w-full rounded-xl bg-brand text-sm font-medium text-text-invert shadow-brand-soft hover:bg-brand-hover"
          >
            Continue to login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            required
            placeholder="Reset token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="premium-input h-12 w-full rounded-xl px-4 text-[16px] focus:outline-none"
          />

          <input
            type="password"
            required
            autoComplete="new-password"
            placeholder="New password"
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
            {submitting ? "Updating…" : "Update password"}
          </button>

          <div className="text-center">
            <Link href="/login" className="text-sm font-semibold text-brand hover:underline">
              Back to login
            </Link>
          </div>
        </form>
      )}
    </AuthCard>
  );
}
