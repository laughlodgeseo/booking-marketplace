"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/http";
import { clearAccessToken, setAccessToken } from "@/lib/auth/tokenStore";

type LoginResponse = {
  accessToken: string;
  user?: {
    id: string;
    email: string;
    role: "CUSTOMER" | "VENDOR" | "ADMIN";
  };
};

type MeResponse = {
  user?: {
    id: string;
    email: string;
    role: "CUSTOMER" | "VENDOR" | "ADMIN";
  };
  id?: string;
  email?: string;
  role?: "CUSTOMER" | "VENDOR" | "ADMIN";
};

function extractMeUser(data: MeResponse): {
  id: string;
  email: string;
  role: "CUSTOMER" | "VENDOR" | "ADMIN";
} {
  if (data.user) return data.user;
  if (!data.id || !data.email || !data.role) {
    throw new Error("Invalid /auth/me response shape.");
  }
  return {
    id: data.id,
    email: data.email,
    role: data.role,
  };
}

function safePath(v: string | null): string {
  if (!v) return "/vendor";
  const s = v.trim();
  if (!s.startsWith("/")) return "/vendor";
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

  const nextPath = useMemo(() => safePath(sp.get("next")), [sp]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    try {
      // 1) Login -> accessToken
      const loginRes = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        body: { email: email.trim(), password },
      });

      if (!loginRes.ok) {
        throw new Error(loginRes.message);
      }

      const token = loginRes.data.accessToken;
      if (!token || token.trim().length === 0) {
        throw new Error(tPortal("vendorLogin.errors.missingToken"));
      }

      // Store token for all portal API calls (your current auth strategy)
      setAccessToken(token);

      // 2) Confirm role == VENDOR
      const meRes = await apiFetch<MeResponse>("/auth/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!meRes.ok) {
        clearAccessToken();
        throw new Error(meRes.message);
      }

      const meUser = extractMeUser(meRes.data);
      if (meUser.role !== "VENDOR") {
        clearAccessToken();
        throw new Error(tPortal("vendorLogin.errors.roleMismatch", { role: meUser.role }));
      }

      router.replace(nextPath);
    } catch (ex) {
      clearAccessToken();
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

            <p className="text-xs text-muted">
              {tPortal("vendorLogin.authNote")}
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
