"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { login as apiLogin } from "@/lib/auth/authApi";
import { clearAccessToken } from "@/lib/auth/tokenStore";
import { useAuth } from "@/lib/auth/auth-context";

// Reject auth/login paths as next targets to prevent redirect loops
const REJECT_AS_NEXT = new Set([
  "/login",
  "/vendor/login",
  "/admin/login",
  "/logout",
  "/forgot",
  "/forgot-password",
  "/signup",
  "/reset-password",
  "/verify-email",
  "/auth",
]);

function safePath(v: string | null): string {
  if (!v) return "/vendor";
  const s = v.trim();
  if (!s.startsWith("/")) return "/vendor";
  if (s.startsWith("//")) return "/vendor";
  const pathOnly = s.split("?")[0];
  if (REJECT_AS_NEXT.has(pathOnly)) return "/vendor";
  return s;
}

export default function VendorLoginPage() {
  const tPortal = useTranslations("portal");

  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-surface">
          <div className="mx-auto max-w-md px-4 pb-24 pt-24 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm text-sm text-secondary">
              {tPortal("loading.vendorLogin")}
            </div>
          </div>
        </main>
      }
    >
      <VendorLoginContent />
    </Suspense>
  );
}

function VendorLoginContent() {
  const tPortal = useTranslations("portal");
  const router = useRouter();
  const sp = useSearchParams();
  const { refresh } = useAuth();

  const nextPath = useMemo(() => safePath(sp.get("next")), [sp]);
  const forgotHref = useMemo(() => {
    const qs = new URLSearchParams({ role: "vendor", next: nextPath, dir: "forward" });
    return `/forgot?${qs.toString()}`;
  }, [nextPath]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    try {
      const data = await apiLogin({ email: email.trim(), password });

      if (data.user.role !== "VENDOR") {
        clearAccessToken();
        throw new Error(tPortal("vendorLogin.errors.roleMismatch", { role: data.user.role }));
      }

      // Sync global AuthContext so RequireAuth passes on all vendor portal pages
      await refresh();

      router.replace(nextPath);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : tPortal("vendorLogin.errors.loginFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-md px-4 pb-24 pt-24 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <div className="text-lg font-semibold text-primary">{tPortal("vendorLogin.title")}</div>
          <p className="mt-1 text-sm text-secondary">
            {tPortal("vendorLogin.subtitle")}
          </p>

          {err ? (
            <div className="mt-4 whitespace-pre-wrap rounded-xl border border-danger/30 bg-danger/12 px-4 py-3 text-sm text-danger">
              {err}
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <label className="block">
              <div className="text-sm font-semibold text-primary">{tPortal("vendorLogin.email")}</div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                inputMode="email"
                autoComplete="email"
                placeholder={tPortal("vendorLogin.emailPlaceholder")}
                className="mt-2 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-brand/10"
              />
            </label>

            <label className="block">
              <div className="text-sm font-semibold text-primary">{tPortal("vendorLogin.password")}</div>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                placeholder={tPortal("vendorLogin.passwordPlaceholder")}
                className="mt-2 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-brand/10"
              />
            </label>

            <button
              type="submit"
              disabled={busy || email.trim().length === 0 || password.length === 0}
              className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-accent-text hover:bg-brand-hover disabled:opacity-50"
            >
              {busy ? tPortal("vendorLogin.signingIn") : tPortal("vendorLogin.signIn")}
            </button>

            <div className="text-right">
              <Link href={forgotHref} className="text-xs font-semibold text-brand hover:underline">
                Forgot password?
              </Link>
            </div>

            <p className="text-xs text-muted">
              {tPortal("vendorLogin.authNote")}
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
