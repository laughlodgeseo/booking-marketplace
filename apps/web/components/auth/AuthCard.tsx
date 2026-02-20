"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLocale } from "next-intl";
import { normalizeLocale } from "@/lib/i18n/config";

type Width = "sm" | "md" | "lg" | "xl";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;

  eyebrow?: string;
  showBackHome?: boolean;
  width?: Width;
  footnote?: ReactNode;
}

const COPY = {
  en: {
    backHome: "Back to home",
    termsPrefix: "By continuing, you agree to our",
    terms: "Terms",
    and: "and",
    privacy: "Privacy Policy",
  },
  ar: {
    backHome: "العودة للرئيسية",
    termsPrefix: "بالمتابعة، فإنك توافق على",
    terms: "الشروط",
    and: "و",
    privacy: "سياسة الخصوصية",
  },
} as const;

function widthClass(w: Width): string {
  switch (w) {
    case "sm":
      return "max-w-sm";
    case "md":
      return "max-w-md";
    case "lg":
      return "max-w-lg";
    case "xl":
      return "max-w-xl";
    default:
      return "max-w-md";
  }
}

export function AuthCard({
  title,
  subtitle,
  children,
  eyebrow,
  showBackHome,
  width = "md",
  footnote,
}: AuthCardProps) {
  const locale = normalizeLocale(useLocale());
  const copy = COPY[locale];

  return (
    <main className="mx-auto flex min-h-dvh w-full items-start justify-center px-4 pb-10 pt-10 sm:px-6 lg:min-h-screen lg:items-center lg:px-8 lg:py-10">
      <div className={`w-full ${widthClass(width)}`}>
        <div className="relative">
          <div className="rounded-3xl border border-white/20 bg-white/95 p-6 shadow-[0_28px_80px_rgba(5,10,28,0.34)] backdrop-blur-xl sm:p-8">
            <header className="mb-6">
              {eyebrow ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-slate-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                  {eyebrow}
                </div>
              ) : null}

              <h1 className="mt-3 text-[30px] font-semibold leading-[1.1] tracking-[-0.01em] text-slate-900 sm:text-3xl sm:leading-tight">
                {title}
              </h1>

              <p className="mt-2 text-[15px] leading-[1.6] text-slate-600">
                {subtitle}
              </p>

              {showBackHome ? (
                <div className="mt-3 text-xs text-slate-600">
                  <Link href="/" className="font-semibold text-indigo-700 hover:underline">
                    {copy.backHome}
                  </Link>
                </div>
              ) : null}
            </header>

            {children}
          </div>

          {footnote ? <div className="mt-4">{footnote}</div> : null}

          <div className="mt-4 text-center text-[11px] leading-relaxed text-slate-600">
            {copy.termsPrefix}{" "}
            <Link href="/terms" className="font-semibold text-slate-700 hover:text-slate-900">
              {copy.terms}
            </Link>{" "}
            {copy.and}{" "}
            <Link href="/privacy" className="font-semibold text-slate-700 hover:text-slate-900">
              {copy.privacy}
            </Link>
            .
          </div>
        </div>
      </div>
    </main>
  );
}
