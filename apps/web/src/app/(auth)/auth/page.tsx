"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Building2, User2, ArrowRight } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";

type AuthMode = "login" | "signup";
type AuthRoleUi = "customer" | "vendor";

function readMode(raw: string | null): AuthMode {
  return raw === "signup" ? "signup" : "login";
}

function readRole(raw: string | null): AuthRoleUi {
  return raw === "vendor" ? "vendor" : "customer";
}

function AuthGatewayContent() {
  const router = useRouter();
  const sp = useSearchParams();

  const initialMode = useMemo<AuthMode>(() => readMode(sp.get("mode")), [sp]);
  const initialRole = useMemo<AuthRoleUi>(() => readRole(sp.get("role")), [sp]);

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [role, setRole] = useState<AuthRoleUi>(initialRole);

  const title = mode === "login" ? "Welcome back" : "Create your account";
  const subtitle =
    mode === "login" ? "Choose how you want to continue." : "Choose an account type to get started.";

  function go() {
    const qs = new URLSearchParams({ role });
    router.push(`/${mode}?${qs.toString()}`);
  }

  return (
    <AuthCard
      title={title}
      subtitle={subtitle}
      eyebrow="Account access"
      showBackHome
      width="lg"
      footnote={
        <div className="text-center text-xs text-secondary">
          {mode === "login" ? (
            <>
              New here?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="font-semibold text-[#4F46E5] hover:underline"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="font-semibold text-[#4F46E5] hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        {/* Mode switch */}
        <div className="flex w-full border-b border-line">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={[
              "relative flex h-11 flex-1 items-center justify-center px-4 text-sm font-semibold transition",
              mode === "login"
                ? "text-[#4F46E5] after:absolute after:bottom-0 after:left-4 after:right-4 after:h-[2px] after:rounded-full after:bg-[#4F46E5]"
                : "text-secondary hover:text-primary",
            ].join(" ")}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={[
              "relative flex h-11 flex-1 items-center justify-center px-4 text-sm font-semibold transition",
              mode === "signup"
                ? "text-[#4F46E5] after:absolute after:bottom-0 after:left-4 after:right-4 after:h-[2px] after:rounded-full after:bg-[#4F46E5]"
                : "text-secondary hover:text-primary",
            ].join(" ")}
          >
            Sign up
          </button>
        </div>

        {/* Role cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          <RoleCard
            active={role === "customer"}
            title="Customer"
            desc="Book stays, manage trips, request refunds."
            icon={<User2 className="h-5 w-5" />}
            onClick={() => setRole("customer")}
          />
          <RoleCard
            active={role === "vendor"}
            title="Vendor"
            desc="List homes, manage availability, handle bookings."
            icon={<Building2 className="h-5 w-5" />}
            onClick={() => setRole("vendor")}
          />
        </div>

        <motion.button
          type="button"
          onClick={go}
          whileTap={{ scale: 0.98 }}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(79,70,229,0.32)] hover:bg-[#4338CA] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30"
        >
          {mode === "login" ? "Continue to login" : "Continue to sign up"}
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      </div>
    </AuthCard>
  );
}

export default function AuthGatewayPage() {
  return (
    <Suspense
      fallback={
        <AuthCard
          title="Loading access"
          subtitle="Preparing account gateway..."
          eyebrow="Account access"
          showBackHome
          width="lg"
        >
          <div className="h-20" />
        </AuthCard>
      }
    >
      <AuthGatewayContent />
    </Suspense>
  );
}

function RoleCard(props: {
  active: boolean;
  title: string;
  desc: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={[
        "group relative overflow-hidden rounded-2xl bg-surface/70 p-4 text-left ring-1 ring-line/55 transition",
        "hover:bg-surface hover:shadow-card",
        props.active ? "ring-2 ring-[#4F46E5]" : "",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl",
            props.active
              ? "bg-[#4F46E5] text-white"
              : "bg-dark-1/5 text-primary",
          ].join(" ")}
        >
          {props.icon}
        </div>

        <div className="min-w-0">
          <div className="text-sm font-semibold text-primary">{props.title}</div>
          <div className="mt-1 text-xs leading-relaxed text-secondary">
            {props.desc}
          </div>
        </div>
      </div>

      {/* subtle sheen */}
      <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span className="absolute -left-24 top-0 h-full w-24 rotate-12 bg-surface/45 blur-xl" />
      </span>
    </button>
  );
}
