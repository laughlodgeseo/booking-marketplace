"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { LockKeyhole } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { type AuthFlowPanel } from "@/components/auth/authFlow";
import { normalizeLocale } from "@/lib/i18n/config";

interface AuthShellProps {
  panel: AuthFlowPanel;
  direction?: 1 | -1;
  title: string;
  subtitle: string;
  panels: Record<AuthFlowPanel, ReactNode>;
}

const PANEL_ORDER: AuthFlowPanel[] = ["login", "signup", "forgot"];
const PANEL_INDEX: Record<AuthFlowPanel, number> = {
  login: 0,
  signup: 1,
  forgot: 2,
};

const COPY = {
  en: {
    secureAccess: "Secure access",
    termsPrefix: "By continuing, you agree to our",
    terms: "Terms",
    and: "and",
    privacy: "Privacy Policy",
  },
  ar: {
    secureAccess: "وصول آمن",
    termsPrefix: "بالمتابعة، فإنك توافق على",
    terms: "الشروط",
    and: "و",
    privacy: "سياسة الخصوصية",
  },
} as const;

type PanelRefs = Record<AuthFlowPanel, HTMLDivElement | null>;
type PanelHeights = Record<AuthFlowPanel, number>;

export function AuthShell({ panel, direction = 1, title, subtitle, panels }: AuthShellProps) {
  const locale = normalizeLocale(useLocale());
  const copy = COPY[locale];
  const reduceMotion = useReducedMotion() ?? false;
  const activeIndex = PANEL_INDEX[panel];
  const panelRefs = useRef<PanelRefs>({ login: null, signup: null, forgot: null });
  const [panelHeights, setPanelHeights] = useState<PanelHeights>({ login: 0, signup: 0, forgot: 0 });
  const hasMeasuredHeight = panelHeights[panel] > 0;
  const activeHeight = panelHeights[panel];

  const panelTransition = useMemo(
    () =>
      reduceMotion
        ? { duration: 0.2, ease: "linear" as const }
        : {
            duration: 0.46,
            ease: direction === -1 ? ([0.26, 1, 0.34, 1] as const) : ([0.22, 1, 0.36, 1] as const),
          },
    [direction, reduceMotion],
  );

  useEffect(() => {
    const updatePanelHeights = () => {
      setPanelHeights((current) => {
        let changed = false;
        const next: PanelHeights = { ...current };

        for (const key of PANEL_ORDER) {
          const height = panelRefs.current[key]?.getBoundingClientRect().height ?? 0;
          if (height > 0 && Math.abs(current[key] - height) > 1) {
            next[key] = height;
            changed = true;
          }
        }

        return changed ? next : current;
      });
    };

    updatePanelHeights();

    window.addEventListener("resize", updatePanelHeights);
    if (typeof ResizeObserver === "undefined") {
      return () => {
        window.removeEventListener("resize", updatePanelHeights);
      };
    }

    const observer = new ResizeObserver(() => {
      updatePanelHeights();
    });

    for (const key of PANEL_ORDER) {
      const node = panelRefs.current[key];
      if (node) observer.observe(node);
    }

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updatePanelHeights);
    };
  }, []);

  return (
    <main className="relative z-20 mx-auto flex min-h-[100svh] w-full items-center justify-center px-4 py-6">
      <motion.section layout className="w-full max-w-[520px]">
        <motion.div
          layout
          className="w-full overflow-hidden rounded-[22px] border border-white/20 bg-white/95 shadow-[0_24px_68px_rgba(4,8,24,0.36)] backdrop-blur-xl"
        >
          <motion.header
            layout
            layoutId="auth-header-band"
            className="m-3 min-h-[112px] rounded-[18px] border border-white/18 bg-[linear-gradient(132deg,#343B95_0%,#5146AE_58%,#5E4EBC_100%)] px-4 py-3.5 text-white shadow-[0_12px_28px_rgba(51,59,152,0.34)] sm:min-h-[126px] sm:px-5 sm:py-4"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/34 bg-white/14 px-2.5 py-1 text-[11px] font-semibold tracking-[0.01em] text-white">
              <LockKeyhole className="h-[13px] w-[13px]" />
              {copy.secureAccess}
            </span>

            <motion.h1 layout className="mt-2.5 text-[1.64rem] font-semibold tracking-tight leading-[1.15] sm:text-[1.74rem]">
              {title}
            </motion.h1>

            <motion.p layout className="mt-1.5 text-[13px] leading-[1.45] text-white/84 sm:text-[14px]">
              {subtitle}
            </motion.p>
          </motion.header>

          <motion.div layout className="px-4 pb-4 sm:px-6 sm:pb-6">
            <motion.div
              className="overflow-hidden"
              initial={false}
              animate={hasMeasuredHeight ? { height: activeHeight } : undefined}
              transition={
                reduceMotion
                  ? { duration: 0.18, ease: "linear" }
                  : { duration: 0.34, ease: [0.2, 0.9, 0.2, 1] }
              }
              style={hasMeasuredHeight ? undefined : { height: "auto" }}
            >
              <motion.div
                className="flex w-full will-change-transform"
                animate={{ x: `-${activeIndex * 100}%` }}
                transition={panelTransition}
              >
                {PANEL_ORDER.map((key) => (
                  <div key={key} className="min-w-full w-full shrink-0">
                    <div ref={(node) => { panelRefs.current[key] = node; }}>
                      {panels[key]}
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>

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
      </motion.section>
    </main>
  );
}
