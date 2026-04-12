"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Building2, Eye, EyeOff, User2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useMemo, useState } from "react";
import { login } from "@/lib/auth/authApi";
import { useAuth } from "@/lib/auth/auth-context";
import { setAccessToken } from "@/lib/auth/tokenStore";
import type { AuthUiRole } from "@/components/auth/authFlow";
import { normalizeLocale } from "@/lib/i18n/config";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { googleLogin } from "@/lib/api/oauth";

interface AuthPanelLoginProps {
  role: AuthUiRole;
  nextPath: string;
}

const INPUT_CLASS =
  "h-12 w-full rounded-[12px] border border-indigo-100/85 bg-[linear-gradient(180deg,rgba(248,242,232,0.95),rgba(240,233,220,0.74))] px-3.5 text-[16px] text-primary shadow-[0_2px_8px_rgba(15,23,42,0.06)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-secondary/55 focus-visible:border-indigo-400 focus-visible:ring-4 focus-visible:ring-indigo-300/25 sm:px-4 lg:h-auto lg:py-3 lg:text-[14px]";

const COPY = {
  en: {
    roleVendor: "Vendor",
    roleCustomer: "Customer",
    roleSignIn: (roleLabel: string) => `${roleLabel} portal sign in`,
    switchRole: "Switch role",
    email: "Email",
    password: "Password",
    emailPlaceholder: "you@example.com",
    passwordPlaceholder: "••••••••",
    hidePassword: "Hide password",
    showPassword: "Show password",
    signingIn: "Signing in...",
    signIn: "Sign in securely",
    forgotPassword: "Forgot password?",
    createAccount: "Create account",
    loginFailed: "Login failed",
  },
  ar: {
    roleVendor: "مزوّد",
    roleCustomer: "عميل",
    roleSignIn: (roleLabel: string) => `تسجيل دخول بوابة ${roleLabel}`,
    switchRole: "تبديل الدور",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    emailPlaceholder: "you@example.com",
    passwordPlaceholder: "••••••••",
    hidePassword: "إخفاء كلمة المرور",
    showPassword: "إظهار كلمة المرور",
    signingIn: "جارٍ تسجيل الدخول...",
    signIn: "تسجيل دخول آمن",
    forgotPassword: "نسيت كلمة المرور؟",
    createAccount: "إنشاء حساب",
    loginFailed: "فشل تسجيل الدخول",
  },
} as const;

export function AuthPanelLogin({ role, nextPath }: AuthPanelLoginProps) {
  const router = useRouter();
  const { refresh } = useAuth();
  const locale = normalizeLocale(useLocale());
  const copy = COPY[locale];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleLabel = role === "vendor" ? copy.roleVendor : copy.roleCustomer;
  const roleIcon = role === "vendor" ? <Building2 className="h-4 w-4" /> : <User2 className="h-4 w-4" />;
  const arrowClass = locale === "ar" ? "h-4 w-4 rotate-180 text-indigo-100" : "h-4 w-4 text-indigo-100";

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

  const backendRole = role === "vendor" ? "VENDOR" : "CUSTOMER";

  async function handleGoogleLogin(credential: string) {
    setError(null);
    const res = await googleLogin(credential, backendRole);
    if (res.ok) {
      setAccessToken(res.data.accessToken);
      await refresh();
      router.push(nextPath);
    } else {
      setError(res.message ?? "Google login failed");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      await refresh();
      router.push(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.loginFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="site-chip inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold">
          <span className="text-indigo-600">{roleIcon}</span>
          {copy.roleSignIn(roleLabel)}
        </div>
        <Link href={qsGateway} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline">
          {copy.switchRole}
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:text-[11px]">{copy.email}</span>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder={copy.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT_CLASS}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:text-[11px]">{copy.password}</span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder={copy.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${INPUT_CLASS} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-secondary/70 transition-colors duration-150 hover:bg-indigo-50 hover:text-indigo-700"
              aria-label={showPassword ? copy.hidePassword : copy.showPassword}
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
          {loading ? copy.signingIn : copy.signIn}
          <ArrowRight className={arrowClass} />
        </button>

        <div className="mt-1 flex items-center justify-between text-xs">
          <Link href={forgotHref} className="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline">
            {copy.forgotPassword}
          </Link>
          <Link href={qsSignup} className="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline">
            {copy.createAccount}
          </Link>
        </div>
      </form>

      <div className="relative flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-indigo-100/70" />
        <span className="text-[11px] font-medium text-secondary/60">or</span>
        <div className="h-px flex-1 bg-indigo-100/70" />
      </div>

      <SocialLoginButtons
        onGoogleLogin={handleGoogleLogin}
        disabled={loading}
      />
    </div>
  );
}
