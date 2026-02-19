"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Building2, Eye, EyeOff, User2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { login, signup } from "@/lib/auth/authApi";
import type { AuthUiRole } from "@/components/auth/authFlow";

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

export function AuthPanelSignup({ role, nextPath }: AuthPanelSignupProps) {
  const router = useRouter();

  const roleLabel = role === "vendor" ? "Vendor" : "Customer";
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
    if (!email.trim()) return "Email is required.";
    if (!password) return "Password is required.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirm) return "Passwords do not match.";

    if (role === "customer") {
      if (!firstName.trim()) return "First name is required.";
      if (!lastName.trim()) return "Last name is required.";
      if (!phone.trim()) return "Phone number is required.";
    } else {
      if (!vendorContactName.trim()) return "Contact name is required.";
      if (!phone.trim()) return "Phone number is required.";
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
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-900">
          <span className="text-indigo-600">{roleIcon}</span>
          {roleLabel} sign up
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Link href={qsLogin} className="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline">
            Sign in
          </Link>
          <Link href={qsGateway} className="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline">
            Switch role
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {role === "customer" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name">
              <TextInput value={firstName} onChange={setFirstName} placeholder="John" autoComplete="given-name" />
            </Field>
            <Field label="Last name">
              <TextInput value={lastName} onChange={setLastName} placeholder="Doe" autoComplete="family-name" />
            </Field>
          </div>
        ) : (
          <Field label="Contact name">
            <TextInput value={vendorContactName} onChange={setVendorContactName} placeholder="Your name" autoComplete="name" />
          </Field>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email">
            <TextInput type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" />
          </Field>
          <Field label="Phone">
            <TextInput value={phone} onChange={setPhone} placeholder="+971 50 123 4567" autoComplete="tel" />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Password">
            <PasswordInput
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm password">
            <PasswordInput
              value={confirm}
              onChange={setConfirm}
              show={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
              autoComplete="new-password"
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
          {loading ? "Creating account..." : "Create account"}
          <ArrowRight className="h-4 w-4" />
        </button>

        <p className="pt-0.5 text-center text-[11px] text-slate-500">
          We use this profile information for booking communication and account security.
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
}) {
  return (
    <div className="relative">
      <input
        type={props.show ? "text" : "password"}
        required
        autoComplete={props.autoComplete}
        placeholder="••••••••"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className={`${INPUT_CLASS} pr-12`}
      />
      <button
        type="button"
        onClick={props.onToggle}
        className="absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition-colors duration-150 hover:bg-indigo-50 hover:text-indigo-700"
        aria-label={props.show ? "Hide password" : "Show password"}
      >
        {props.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
