"use client";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useLocale } from "next-intl";
import type { AuthFlowPanel } from "./authFlow";
interface AuthSplitScreenProps {
  panel: AuthFlowPanel;
  direction?: 1 | -1;
  title: string;
  subtitle: string;
  panels: Record<AuthFlowPanel, ReactNode>;
}
export function AuthSplitScreen({
  panel,
  direction = 1,
  title,
  subtitle,
  panels,
}: AuthSplitScreenProps) {
  const ar = useLocale() === "ar";
  const reduced = useReducedMotion();
  return (
    <main className="story-auth-page">
      <div className="story-auth-photo">
        <Image
          src="/images/home/interior-suite.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </div>
      <Link href="/" className="story-auth-home story-wordmark">
        laugh<span>&</span>lodge.
      </Link>
      <div className="story-auth-caption">
        <h2>
          {ar ? (
            <>
              مساحتك
              <br />
              في المدينة.
            </>
          ) : (
            <>
              Your place
              <br />
              in the city.
            </>
          )}
        </h2>
        <p>
          {ar
            ? "رحلتك القادمة تبدأ من هنا."
            : "A familiar welcome.\nA new place to call your own."}
        </p>
      </div>
      <section className="story-auth-panel">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={panel}
            initial={
              reduced ? { opacity: 0 } : { opacity: 0, x: direction * 22 }
            }
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: direction * -15 }}
            transition={{
              duration: reduced ? 0.1 : 0.3,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {panels[panel]}
          </motion.div>
        </AnimatePresence>
        <p className="story-auth-terms">
          {ar ? "بالمتابعة، توافق على " : "By continuing, you agree to our "}
          <Link href="/terms">
            {ar ? "الشروط والأحكام" : "Terms & Conditions"}
          </Link>
          {ar ? " و" : " and "}
          <Link href="/privacy">
            {ar ? "سياسة الخصوصية" : "Privacy Policy"}
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
