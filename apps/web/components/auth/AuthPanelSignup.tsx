"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Building2, Eye, EyeOff, User2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useMemo, useState } from "react";
import { login, signup } from "@/lib/auth/authApi";
import type { AuthUiRole } from "@/components/auth/authFlow";
import { normalizeLocale } from "@/lib/i18n/config";

type SignupDraft = {
  role: AuthUiRole;
  firstName?: string;
  lastName?: string;
  phone?: string;
  vendorContactName?: string;
  email: string;
};

interface AuthPanelSignupProps {
  role: AuthUiRole;
  nextPath: string;
}

const DRAFT_KEY = "ll_signup_profile_draft_v1";

const INPUT_CLASS =
  "h-12 w-full rounded-[12px] border border-slate-200 bg-white px-3.5 text-[16px] text-slate-900 shadow-[0_2px_8px_rgba(15,23,42,0.06)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-indigo-300/25 sm:px-4 lg:h-auto lg:py-3 lg:text-[14px]";

const COPY = {
  en: {
    roleVendor: "Vendor",
    roleCustomer: "Customer",
    roleSignUp: (roleLabel: string) => `${roleLabel} sign up`,
    signIn: "Sign in",
    switchRole: "Switch role",
    firstName: "First name",
    firstNamePlaceholder: "John",
    lastName: "Last name",
    lastNamePlaceholder: "Doe",
    contactName: "Contact name",
    contactNamePlaceholder: "Your name",
    email: "Email",
    emailPlaceholder: "you@example.com",
    phone: "Phone",
    phonePlaceholder: "+971 50 123 4567",
    password: "Password",
    confirmPassword: "Confirm password",
    passwordPlaceholder: "••••••••",
    hidePassword: "Hide password",
    showPassword: "Show password",
    creatingAccount: "Creating account...",
    createAccount: "Create account",
    profileInfoHint: "We use this profile information for booking communication and account security.",
    signupFailed: "Signup failed",
    validation: {
      emailRequired: "Email is required.",
      passwordRequired: "Password is required.",
      passwordMin: "Password must be at least 8 characters.",
      passwordMismatch: "Passwords do not match.",
      firstNameRequired: "First name is required.",
      lastNameRequired: "Last name is required.",
      phoneRequired: "Phone number is required.",
      contactNameRequired: "Contact name is required.",
    },
  },
  ar: {
    roleVendor: "مزوّد",
    roleCustomer: "عميل",
    roleSignUp: (roleLabel: string) => `إنشاء حساب ${roleLabel}`,
    signIn: "تسجيل الدخول",
    switchRole: "تبديل الدور",
    firstName: "الاسم الأول",
    firstNamePlaceholder: "محمد",
    lastName: "اسم العائلة",
    lastNamePlaceholder: "أحمد",
    contactName: "اسم جهة التواصل",
    contactNamePlaceholder: "اسمك",
    email: "البريد الإلكتروني",
    emailPlaceholder: "you@example.com",
    phone: "رقم الهاتف",
    phonePlaceholder: "+971 50 123 4567",
    password: "كلمة المرور",
    confirmPassword: "تأكيد كلمة المرور",
    passwordPlaceholder: "••••••••",
    hidePassword: "إخفاء كلمة المرور",
    showPassword: "إظهار كلمة المرور",
    creatingAccount: "جارٍ إنشاء الحساب...",
    createAccount: "إنشاء حساب",
    profileInfoHint: "نستخدم معلومات الملف للتواصل الخاص بالحجز وتعزيز أمان الحساب.",
    signupFailed: "تعذر إنشاء الحساب",
    validation: {
      emailRequired: "البريد الإلكتروني مطلوب.",
      passwordRequired: "كلمة المرور مطلوبة.",
      passwordMin: "يجب ألا تقل كلمة المرور عن 8 أحرف.",
      passwordMismatch: "كلمتا المرور غير متطابقتين.",
      firstNameRequired: "الاسم الأول مطلوب.",
      lastNameRequired: "اسم العائلة مطلوب.",
      phoneRequired: "رقم الهاتف مطلوب.",
      contactNameRequired: "اسم جهة التواصل مطلوب.",
    },
  },
} as const;

export function AuthPanelSignup({ role, nextPath }: AuthPanelSignupProps) {
  const router = useRouter();
  const locale = normalizeLocale(useLocale());
  const copy = COPY[locale];

  const roleLabel = role === "vendor" ? copy.roleVendor : copy.roleCustomer;
  const roleIcon = role === "vendor" ? <Building2 className="h-4 w-4" /> : <User2 className="h-4 w-4" />;

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [vendorContactName, setVendorContactName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qsGateway = useMemo(() => {
    const qs = new URLSearchParams({ mode: "signup", role });
    return `/auth?${qs.toString()}`;
  }, [role]);

  const qsLogin = useMemo(() => {
    const qs = new URLSearchParams({ role, next: nextPath, dir: "back" });
    return `/login?${qs.toString()}`;
  }, [role, nextPath]);

  function validate(): string | null {
    if (!email.trim()) return copy.validation.emailRequired;
    if (!password) return copy.validation.passwordRequired;
    if (password.length < 8) return copy.validation.passwordMin;
    if (password !== confirm) return copy.validation.passwordMismatch;

    if (role === "customer") {
      if (!firstName.trim()) return copy.validation.firstNameRequired;
      if (!lastName.trim()) return copy.validation.lastNameRequired;
      if (!phone.trim()) return copy.validation.phoneRequired;
    } else {
      if (!vendorContactName.trim()) return copy.validation.contactNameRequired;
      if (!phone.trim()) return copy.validation.phoneRequired;
    }

    return null;
  }

  function persistDraft() {
    const draft: SignupDraft =
      role === "customer"
        ? {
            role,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim(),
            email: email.trim(),
          }
        : {
            role,
            vendorContactName: vendorContactName.trim(),
            phone: phone.trim(),
            email: email.trim(),
          };

    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // ignore storage failures
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      persistDraft();
      const fullName =
        role === "customer"
          ? `${firstName.trim()} ${lastName.trim()}`.trim()
          : vendorContactName.trim();

      await signup({
        email: email.trim(),
        password,
        fullName: fullName || undefined,
        role: role === "vendor" ? "VENDOR" : "CUSTOMER",
      });

      await login({ email: email.trim(), password });
      const qs = new URLSearchParams({ role, next: nextPath, email: email.trim() });
      router.push(`/verify-email?${qs.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.signupFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-900">
          <span className="text-indigo-600">{roleIcon}</span>
          {copy.roleSignUp(roleLabel)}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Link href={qsLogin} className="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline">
            {copy.signIn}
          </Link>
          <Link href={qsGateway} className="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline">
            {copy.switchRole}
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {role === "customer" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={copy.firstName}>
              <TextInput value={firstName} onChange={setFirstName} placeholder={copy.firstNamePlaceholder} autoComplete="given-name" />
            </Field>
            <Field label={copy.lastName}>
              <TextInput value={lastName} onChange={setLastName} placeholder={copy.lastNamePlaceholder} autoComplete="family-name" />
            </Field>
          </div>
        ) : (
          <Field label={copy.contactName}>
            <TextInput value={vendorContactName} onChange={setVendorContactName} placeholder={copy.contactNamePlaceholder} autoComplete="name" />
          </Field>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={copy.email}>
            <TextInput type="email" value={email} onChange={setEmail} placeholder={copy.emailPlaceholder} autoComplete="email" />
          </Field>
          <Field label={copy.phone}>
            <TextInput value={phone} onChange={setPhone} placeholder={copy.phonePlaceholder} autoComplete="tel" />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={copy.password}>
            <PasswordInput
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
              autoComplete="new-password"
              placeholder={copy.passwordPlaceholder}
              showLabel={copy.showPassword}
              hideLabel={copy.hidePassword}
            />
          </Field>
          <Field label={copy.confirmPassword}>
            <PasswordInput
              value={confirm}
              onChange={setConfirm}
              show={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
              autoComplete="new-password"
              placeholder={copy.passwordPlaceholder}
              showLabel={copy.showPassword}
              hideLabel={copy.hidePassword}
            />
          </Field>
        </div>

        <AnimatePresence initial={false}>
          {error ? (
            <motion.p
              key="signup-error"
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
          {loading ? copy.creatingAccount : copy.createAccount}
          <ArrowRight className="h-4 w-4" />
        </button>

        <p className="pt-0.5 text-center text-[11px] text-slate-500">
          {copy.profileInfoHint}
        </p>
      </form>
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:text-[11px]">{props.label}</span>
      {props.children}
    </label>
  );
}

function TextInput(props: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "text" | "email";
  autoComplete?: string;
}) {
  return (
    <input
      type={props.type ?? "text"}
      required
      autoComplete={props.autoComplete}
      placeholder={props.placeholder}
      value={props.value}
      onChange={(event) => props.onChange(event.target.value)}
      className={INPUT_CLASS}
    />
  );
}

function PasswordInput(props: {
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete: string;
  placeholder: string;
  showLabel: string;
  hideLabel: string;
}) {
  return (
    <div className="relative">
      <input
        type={props.show ? "text" : "password"}
        required
        autoComplete={props.autoComplete}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className={`${INPUT_CLASS} pr-12`}
      />
      <button
        type="button"
        onClick={props.onToggle}
        className="absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition-colors duration-150 hover:bg-indigo-50 hover:text-indigo-700"
        aria-label={props.show ? props.hideLabel : props.showLabel}
      >
        {props.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
