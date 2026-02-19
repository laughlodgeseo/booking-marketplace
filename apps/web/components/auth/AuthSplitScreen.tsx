"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import { AuthBlobImage } from "@/components/auth/AuthBlobImage";
import { AuthDottedCurve } from "@/components/auth/AuthDottedCurve";
import { type AuthFlowPanel } from "@/components/auth/authFlow";

interface AuthSplitScreenProps {
  panel: AuthFlowPanel;
  direction?: 1 | -1;
  title: string;
  subtitle: string;
  panels: Record<AuthFlowPanel, ReactNode>;
}

const SWITCH_TRANSITION = {
  duration: 0.55,
  ease: [0.22, 1, 0.36, 1] as const,
};

export function AuthSplitScreen({
  panel,
  direction = 1,
  title,
  subtitle,
  panels,
}: AuthSplitScreenProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const imageOnLeft = panel !== "signup";
  const formX = imageOnLeft ? "100%" : "0%";
  const imageX = imageOnLeft ? "0%" : "100%";

  return (
    <main className="relative min-h-dvh w-full overflow-hidden md:h-[100svh]">
      <div className="flex min-h-dvh flex-col md:hidden">
        <div className="relative h-[200px] shrink-0 sm:h-[220px]">
          <AuthBlobImage panel={panel} edge="left" className="scale-[1.04]" />
        </div>

        <section className="relative flex-1 overflow-hidden border-t border-[#dbe5f2] bg-white">
          <div className="h-full overflow-y-auto px-4 pb-5 pt-10 sm:px-6 sm:pb-6 sm:pt-10">
            <div className="mx-auto w-full max-w-[460px]">
              <HeaderCopy title={title} subtitle={subtitle} compact />

              <div className="mt-4 overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                  <motion.div
                    key={`mobile-${panel}`}
                    custom={direction}
                    initial={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, x: direction === 1 ? 42 : -42 }
                    }
                    animate={{ opacity: 1, x: 0 }}
                    exit={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, x: direction === 1 ? -42 : 42 }
                    }
                    transition={reduceMotion ? { duration: 0.16 } : SWITCH_TRANSITION}
                  >
                    {panels[panel]}
                  </motion.div>
                </AnimatePresence>
              </div>

              <TermsCopy compact />
            </div>
          </div>
        </section>
      </div>

      <div className="relative hidden h-full md:block">
        <AuthDottedCurve className="pointer-events-none absolute bottom-[8%] left-1/2 top-[8%] z-20 w-[168px] -translate-x-1/2 opacity-70 lg:w-[206px]" />

        <motion.section
          animate={{ x: imageX }}
          transition={reduceMotion ? { duration: 0.18 } : SWITCH_TRANSITION}
          className="absolute inset-y-0 left-0 w-1/2 will-change-transform"
        >
          <div className={`relative h-full w-full ${imageOnLeft ? "translate-x-7" : "-translate-x-7"}`}>
            <AuthBlobImage panel={panel} edge={imageOnLeft ? "right" : "left"} />
          </div>
        </motion.section>

        <motion.section
          animate={{ x: formX }}
          transition={reduceMotion ? { duration: 0.18 } : SWITCH_TRANSITION}
          className={`absolute inset-y-0 left-0 z-10 w-1/2 bg-white/95 will-change-transform ${
            imageOnLeft ? "border-l border-[#dbe5f2]" : "border-r border-[#dbe5f2]"
          }`}
        >
          <div className="h-full overflow-y-auto">
            <div className="mx-auto flex min-h-full w-full max-w-[460px] flex-col justify-center px-8 py-7 lg:px-10 lg:py-9">
              <HeaderCopy title={title} subtitle={subtitle} />

              <div className="mt-4 overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                  <motion.div
                    key={`desktop-${panel}`}
                    custom={direction}
                    initial={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, x: direction === 1 ? 56 : -56 }
                    }
                    animate={{ opacity: 1, x: 0 }}
                    exit={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, x: direction === 1 ? -56 : 56 }
                    }
                    transition={reduceMotion ? { duration: 0.16 } : SWITCH_TRANSITION}
                  >
                    {panels[panel]}
                  </motion.div>
                </AnimatePresence>
              </div>

              <TermsCopy />
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  );
}

function HeaderCopy({
  title,
  subtitle,
  compact = false,
}: {
  title: string;
  subtitle: string;
  compact?: boolean;
}) {
  return (
    <header>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-[#d5e2f2] bg-[#edf3fb] font-semibold uppercase tracking-[0.12em] text-[#48648a] ${
          compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1 text-[11px]"
        }`}
      >
        <LockKeyhole className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
        Secure access
      </span>

      <h1
        className={`mt-3 font-semibold tracking-[-0.01em] text-slate-900 ${
          compact ? "text-[30px] leading-[1.1]" : "text-[1.9rem] leading-tight lg:text-[2.08rem]"
        }`}
      >
        {title}
      </h1>
      <p className={`mt-1.5 leading-relaxed text-slate-600 ${compact ? "text-[15px] leading-[1.6]" : "text-[14px] lg:text-[15px]"}`}>
        {subtitle}
      </p>
    </header>
  );
}

function TermsCopy({ compact = false }: { compact?: boolean }) {
  return (
    <p className={`mt-4 text-[11px] leading-relaxed text-slate-500 ${compact ? "text-center" : ""}`}>
      By continuing, you agree to our{" "}
      <Link href="/terms" className="font-semibold text-slate-700 hover:text-slate-900">
        Terms
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className="font-semibold text-slate-700 hover:text-slate-900">
        Privacy Policy
      </Link>
      .
    </p>
  );
}
