"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Building2, Eye, EyeOff, User2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { login } from "@/lib/auth/authApi";
import { useAuth } from "@/lib/auth/auth-context";
import type { AuthUiRole } from "@/components/auth/authFlow";

interface AuthPanelLoginProps {
  role: AuthUiRole;
  nextPath: string;
}

const INPUT_CLASS =
  "h-12 w-full rounded-[12px] border border-slate-200 bg-white px-3.5 text-[16px] text-slate-900 shadow-[0_2px_8px_rgba(15,23,42,0.06)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-indigo-300/25 sm:px-4 lg:h-auto lg:py-3 lg:text-[14px]";

export function AuthPanelLogin({ role, nextPath }: AuthPanelLoginProps) {
  const router = useRouter();
  const { refresh } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleLabel = role === "vendor" ? "Vendor" : "Customer";
  const roleIcon = role === "vendor" ? <Building2 className="h-4 w-4" /> : <User2 className="h-4 w-4" />;

  const qsGateway = useMemo(() => {
    const qs = new URLSearchParams({ mode: "login", role });
    return `/auth?${qs.toString()}`;
  }, [role]);

  const qsSignup = useMemo(() => {
    const qs = new URLSearchParams({ role, next: nextPath, dir: "forward" });
    return `/signup?${qs.toString()}`;
  }, [role, nextPath]);

  const forgotHref = useMemo(() => {
    const qs = new URLSearchParams({ role, next: nextPath, dir: "forward" });
    return `/forgot?${qs.toString()}`;
  }, [role, nextPath]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      await refresh();
      router.push(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-900">
          <span className="text-indigo-600">{roleIcon}</span>
          {roleLabel} sign in
        </div>
        <Link href={qsGateway} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline">
          Switch role
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:text-[11px]">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT_CLASS}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:text-[11px]">Password</span>
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
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition-colors duration-150 hover:bg-indigo-50 hover:text-indigo-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        <AnimatePresence initial={false}>
          {error ? (
            <motion.p
              key="login-error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 break-words"
            >
              {error}
            </motion.p>
          ) : null}
        </AnimatePresence>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#2F3EA3] px-5 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(47,62,163,0.30)] transition-colors duration-150 hover:bg-[#27358F] disabled:cursor-not-allowed disabled:opacity-65 lg:h-auto lg:py-3.5"
        >
          {loading ? "Signing in..." : "Sign in"}
          <ArrowRight className="h-4 w-4" />
        </button>

        <div className="mt-1 flex items-center justify-between text-xs">
          <Link href={forgotHref} className="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline">
            Forgot password?
          </Link>
          <Link href={qsSignup} className="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline">
            Create account
          </Link>
        </div>
      </form>
    </div>
  );
}
