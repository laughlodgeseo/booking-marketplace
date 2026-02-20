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
    terms: "Terms & Conditions",
    and: "and",
    privacy: "Privacy Policy",
  },
  ar: {
    backHome: "العودة للرئيسية",
    termsPrefix: "بالمتابعة، فإنك توافق على",
    terms: "الشروط والأحكام",
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
          <div className="site-surface-card rounded-3xl p-6 shadow-[0_28px_80px_rgba(5,10,28,0.24)] backdrop-blur-xl sm:p-8">
            <header className="mb-6">
              {eyebrow ? (
                <div className="site-chip inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  {eyebrow}
                </div>
              ) : null}

              <h1 className="mt-3 text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-primary sm:text-[2.1rem] sm:leading-tight">
                {title}
              </h1>

              <p className="mt-2 text-[15px] leading-[1.62] text-secondary/86">
                {subtitle}
              </p>

              {showBackHome ? (
                <div className="mt-3 text-xs text-secondary/78">
                  <Link href="/" className="font-semibold text-indigo-700 hover:underline">
                    {copy.backHome}
                  </Link>
                </div>
              ) : null}
            </header>

            {children}
          </div>

          {footnote ? <div className="mt-4">{footnote}</div> : null}

          <div className="mt-4 text-center text-[11px] leading-relaxed text-secondary/72">
            {copy.termsPrefix}{" "}
            <Link href="/terms" className="font-semibold text-primary hover:text-indigo-800">
              {copy.terms}
            </Link>{" "}
            {copy.and}{" "}
            <Link href="/privacy" className="font-semibold text-primary hover:text-indigo-800">
              {copy.privacy}
            </Link>
            .
          </div>
        </div>
      </div>
    </main>
  );
}
