"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { login } from "@/lib/auth/authApi";
import { clearAccessToken } from "@/lib/auth/tokenStore";
import { useAuth } from "@/lib/auth/auth-context";
import { safeAdminNextPath } from "@/components/auth/authFlow";

const INPUT_CLASS =
  "h-12 w-full rounded-[12px] border border-indigo-100/85 bg-[linear-gradient(180deg,rgba(248,242,232,0.95),rgba(240,233,220,0.74))] px-3.5 text-[16px] text-primary shadow-[0_2px_8px_rgba(15,23,42,0.06)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-secondary/55 focus-visible:border-indigo-400 focus-visible:ring-4 focus-visible:ring-indigo-300/25 sm:px-4 lg:h-auto lg:py-3 lg:text-[14px]";

interface AdminLoginPanelProps {
  nextPath: string;
}

export function AdminLoginPanel({ nextPath }: AdminLoginPanelProps) {
  const router = useRouter();
  const { status, user, refresh, logout } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Already authenticated as admin — go straight to destination.
  useEffect(() => {
    if (status === "authenticated" && user?.role === "ADMIN") {
      router.replace(safeAdminNextPath(nextPath));
    }
  }, [status, user, router, nextPath]);

  // Already authenticated but not admin — show friendly mismatch message.
  if (status === "authenticated" && user && user.role !== "ADMIN") {
    return (
      <div className="flex w-full flex-col gap-4">
        <div className="site-chip inline-flex w-fit items-center gap-2 px-3 py-1.5 text-xs font-semibold">
          <ShieldCheck className="h-4 w-4 text-indigo-600" />
          Admin console access
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5">
          <p className="text-sm font-semibold text-amber-900">Admin access required</p>
          <p className="mt-1 text-sm text-amber-800">
            You are signed in as <span className="font-semibold">{user.email}</span> (
            {user.role.toLowerCase()}). The admin portal requires an administrator account.
          </p>

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              disabled={loggingOut}
              onClick={async () => {
                setLoggingOut(true);
                await logout();
              }}
              className="site-cta-primary inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-white transition-colors duration-150 disabled:opacity-60 lg:h-auto lg:py-3.5"
            >
              {loggingOut ? "Signing out..." : "Sign out and use admin account"}
              <ArrowRight className="h-4 w-4 text-indigo-100" />
            </button>
            <button
              type="button"
              onClick={() => router.push(user.role === "VENDOR" ? "/vendor" : "/account")}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-amber-100 px-5 text-sm font-semibold text-amber-900 transition-colors duration-150 hover:bg-amber-200 lg:h-auto lg:py-3.5"
            >
              Return to your portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Session check in progress.
  if (status === "loading") {
    return (
      <div className="flex w-full items-center justify-center py-12">
        <div className="text-sm text-muted">Checking session...</div>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await login({ email, password });

      if (data.user.role !== "ADMIN") {
        // Clear the non-admin token so it doesn't bleed into auth context.
        clearAccessToken();
        setError(
          "This account does not have admin access. Use an administrator account to continue."
        );
        return;
      }

      await refresh();
      router.push(safeAdminNextPath(nextPath));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const forgotHref = `/forgot?next=${encodeURIComponent(safeAdminNextPath(nextPath))}`;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="site-chip inline-flex w-fit items-center gap-2 px-3 py-1.5 text-xs font-semibold">
        <ShieldCheck className="h-4 w-4 text-indigo-600" />
        Admin console access
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:text-[11px]">
            Email
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT_CLASS}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:text-[11px]">
            Password
          </span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${INPUT_CLASS} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-secondary/70 transition-colors duration-150 hover:bg-indigo-50 hover:text-indigo-700"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        <AnimatePresence initial={false}>
          {error ? (
            <motion.p
              key="admin-login-error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-[14px] border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger break-words"
            >
              {error}
            </motion.p>
          ) : null}
        </AnimatePresence>

        <button
          type="submit"
          disabled={loading}
          className="site-cta-primary inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-white transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-65 lg:h-auto lg:py-3.5"
        >
          {loading ? "Signing in..." : "Sign in to admin console"}
          <ArrowRight className="h-4 w-4 text-indigo-100" />
        </button>

        <div className="mt-1 flex items-center justify-start text-xs">
          <Link
            href={forgotHref}
            className="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
      </form>

      <p className="text-[11px] leading-relaxed text-secondary/60">
        Administrator access only. Activity may be monitored for platform security.
      </p>
    </div>
  );
}
