"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import styles from "./preloader.module.css";

type PreloaderProps = {
  /**
   * Minimum time the preloader stays visible (ms).
   * Keeps the Tourm premium load feel even on fast pages.
   */
  minDurationMs?: number;

  /**
   * If true, preloader will not show again for the same app load marker.
   */
  oncePerSession?: boolean;
};

type LoaderState = "show" | "hide" | "disabled";
type LoaderPhase = "intro" | "reveal" | "assemble" | "impact" | "lock" | "exit";
type IntroOverride = "force-on" | "force-off" | null;
type NavType = PerformanceNavigationTiming["type"] | "unknown";

type Timeline = {
  revealStart: number;
  assembleStart: number;
  impactStart: number;
  lockStart: number;
  exitStart: number;
  end: number;
};

const SESSION_KEY = "ll_preloader_seen_v1";
const DESKTOP_TOTAL_MS = 2600;
const MOBILE_TOTAL_MS = 2200;
const MAX_DURATION_MS = 4000;
const LUX_EASE = [0.22, 1, 0.36, 1] as const;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function easeOutCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return 1 - Math.pow(1 - x, 3);
}

function getLoadMarker(): string {
  return String(Math.floor(performance.timeOrigin));
}

function getStoredLoadMarker(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function setStoredLoadMarker(marker: string): void {
  try {
    sessionStorage.setItem(SESSION_KEY, marker);
  } catch {
    // ignore storage failures
  }
}

function clearStoredLoadMarker(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore storage failures
  }
}

function readIntroOverride(): IntroOverride {
  const qs = new URLSearchParams(window.location.search);
  const intro = qs.get("intro") ?? qs.get("loader");
  if (intro === "1") return "force-on";
  if (intro === "0") return "force-off";
  return null;
}

function shouldShowLoaderDebug(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  const value = new URLSearchParams(window.location.search).get("loaderDebug");
  return value === "1";
}

function getNavigationType(): NavType {
  const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return navEntry?.type ?? "unknown";
}

function buildTimeline(totalMs: number): Timeline {
  const scale = totalMs / DESKTOP_TOTAL_MS;

  return {
    revealStart: Math.round(350 * scale),
    assembleStart: Math.round(900 * scale),
    impactStart: Math.round(1700 * scale),
    lockStart: Math.round(1930 * scale),
    exitStart: Math.round(2150 * scale),
    end: Math.round(2600 * scale),
  };
}

function progressAt(elapsed: number, timeline: Timeline): number {
  const a = timeline.assembleStart;
  const i = timeline.impactStart;
  const l = timeline.lockStart;
  const e = timeline.exitStart;
  const end = timeline.end;

  if (elapsed <= a) {
    return 0.72 * easeOutCubic(elapsed / Math.max(1, a));
  }

  if (elapsed <= i) {
    return 0.72 + 0.18 * easeOutCubic((elapsed - a) / Math.max(1, i - a));
  }

  if (elapsed <= l) {
    return 0.9 + 0.06 * easeOutCubic((elapsed - i) / Math.max(1, l - i));
  }

  if (elapsed <= e) {
    return 0.96 + 0.025 * easeOutCubic((elapsed - l) / Math.max(1, e - l));
  }

  if (elapsed <= end) {
    return 0.985 + 0.015 * easeOutCubic((elapsed - e) / Math.max(1, end - e));
  }

  return 1;
}

export default function Preloader(props: PreloaderProps) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const isDev = process.env.NODE_ENV === "development";
  const configuredMinDurationMs = clamp(props.minDurationMs ?? 2600, 1600, 5500);
  const oncePerSession = props.oncePerSession ?? true;

  const [mounted, setMounted] = useState(false);
  const [debugBadgeEnabled, setDebugBadgeEnabled] = useState(false);
  const [loaderState, setLoaderState] = useState<LoaderState>("disabled");
  const [phase, setPhase] = useState<LoaderPhase>("intro");
  const [progress, setProgress] = useState(0);
  const [seenFlag, setSeenFlag] = useState<"0" | "1" | "-">("-");
  const [visibilityState, setVisibilityState] = useState<string>("hidden");
  const [mountStamp, setMountStamp] = useState<number | null>(null);
  const [hideStamp, setHideStamp] = useState<number | null>(null);
  const [debugNow, setDebugNow] = useState(0);
  const [navTypeDebug, setNavTypeDebug] = useState<NavType>("unknown");

  const hasRunRef = useRef(false);
  const progressRef = useRef(0);

  const elapsedMs = useMemo(() => {
    if (mountStamp === null) return 0;
    const now = debugNow || performance.now();
    return Math.max(0, Math.round(now - mountStamp));
  }, [debugNow, mountStamp]);

  const logDebug = (...args: unknown[]) => {
    if (isDev && debugBadgeEnabled) {
      console.info(...args);
    }
  };

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const qs = new URLSearchParams(window.location.search);
    if (qs.get("loaderReset") === "1") {
      clearStoredLoadMarker();
      qs.delete("loaderReset");
      const query = qs.toString();
      const next = query ? `${window.location.pathname}?${query}` : window.location.pathname;
      window.location.replace(next || window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const mountTimer = window.setTimeout(() => {
      setMounted(true);
      setVisibilityState(document.visibilityState);
      setDebugNow(performance.now());
    }, 0);

    return () => {
      window.clearTimeout(mountTimer);
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    setDebugBadgeEnabled(shouldShowLoaderDebug());
  }, []);

  useEffect(() => {
    if (!debugBadgeEnabled) return;

    logDebug("[Preloader] mount", pathname, performance.now());
    return () => {
      logDebug("[Preloader] unmount", pathname, performance.now());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debugBadgeEnabled]);

  useEffect(() => {
    if (!debugBadgeEnabled) return;
    logDebug("[Preloader] path", pathname, performance.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debugBadgeEnabled, pathname]);

  useEffect(() => {
    if (!mounted || !debugBadgeEnabled) return;

    const onVisibilityChange = () => {
      setVisibilityState(document.visibilityState);
      setDebugNow(performance.now());
    };

    const initialTimer = window.setTimeout(onVisibilityChange, 0);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearTimeout(initialTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [mounted, debugBadgeEnabled]);

  useEffect(() => {
    if (!mounted || !debugBadgeEnabled) return;

    const id = window.setInterval(() => {
      setDebugNow(performance.now());
    }, 120);

    return () => {
      window.clearInterval(id);
    };
  }, [mounted, debugBadgeEnabled]);

  useEffect(() => {
    if (!mounted || hasRunRef.current) return;
    hasRunRef.current = true;

    let raf = 0;
    let finished = false;
    const timers: number[] = [];

    const setProgressValue = (value: number) => {
      const next = clamp(value, 0, 1);
      progressRef.current = next;
      setProgress(next);
    };

    const introOverride = readIntroOverride();
    const navType = getNavigationType();
    const showByNavigation = navType === "navigate" || navType === "reload" || navType === "unknown";
    const loadMarker = getLoadMarker();
    const sameLoadSeen = getStoredLoadMarker() === loadMarker;

    setNavTypeDebug(navType);
    setSeenFlag(sameLoadSeen ? "1" : "0");

    const shouldShow =
      introOverride === "force-on" ||
      (introOverride !== "force-off" && showByNavigation && (!oncePerSession || !sameLoadSeen));

    if (introOverride === "force-off" || !shouldShow) {
      const disableTimer = window.setTimeout(() => {
        setLoaderState("disabled");
        setPhase("intro");
        setProgress(0);
      }, 0);
      timers.push(disableTimer);

      return () => {
        window.cancelAnimationFrame(raf);
        timers.forEach((id) => window.clearTimeout(id));
      };
    }

    if (oncePerSession) {
      setStoredLoadMarker(loadMarker);
      setSeenFlag("1");
    }

    const isMobileViewport = window.matchMedia("(max-width: 767px)").matches;
    const baseDuration = props.minDurationMs == null ? (isMobileViewport ? MOBILE_TOTAL_MS : DESKTOP_TOTAL_MS) : configuredMinDurationMs;

    const cinematicDuration = clamp(baseDuration, 1600, 5500);
    const totalDuration = clamp(cinematicDuration, 600, MAX_DURATION_MS);

    const timeline = shouldReduceMotion
      ? {
          revealStart: 80,
          assembleStart: 80,
          impactStart: 80,
          lockStart: 80,
          exitStart: 520,
          end: 880,
        }
      : buildTimeline(totalDuration);

    const startedAt = performance.now();

    const finishAndDisable = () => {
      if (finished) return;
      finished = true;
      setProgressValue(1);
      setLoaderState("disabled");
    };

    const beginExit = () => {
      if (finished) return;
      setLoaderState("hide");
      setPhase("exit");
      setHideStamp(performance.now());
      logDebug("[Preloader] hide", performance.now());
    };

    setLoaderState("show");
    setPhase("intro");
    setProgressValue(0);
    setMountStamp(startedAt);
    setHideStamp(null);

    const progressTick = () => {
      if (finished) return;

      const elapsed = performance.now() - startedAt;
      setProgressValue(progressAt(elapsed, timeline));

      if (elapsed < timeline.end) {
        raf = window.requestAnimationFrame(progressTick);
      }
    };

    raf = window.requestAnimationFrame(progressTick);

    timers.push(window.setTimeout(() => setPhase("reveal"), timeline.revealStart));
    timers.push(window.setTimeout(() => setPhase("assemble"), timeline.assembleStart));
    timers.push(window.setTimeout(() => setPhase("impact"), timeline.impactStart));
    timers.push(window.setTimeout(() => setPhase("lock"), timeline.lockStart));
    timers.push(window.setTimeout(beginExit, timeline.exitStart));
    timers.push(window.setTimeout(finishAndDisable, timeline.end));

    // Safety cap: never keep the overlay beyond this timeout.
    timers.push(
      window.setTimeout(() => {
        beginExit();
        timers.push(window.setTimeout(finishAndDisable, 220));
      }, MAX_DURATION_MS),
    );

    return () => {
      window.cancelAnimationFrame(raf);
      timers.forEach((id) => window.clearTimeout(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, configuredMinDurationMs, oncePerSession, shouldReduceMotion]);

  const showOverlay = mounted && loaderState !== "disabled";

  if (!mounted) return null;

  return (
    <>
      <AnimatePresence>
        {showOverlay ? (
          <motion.div
            className="fixed inset-0 z-[2147483647] isolate grid place-items-center bg-surface"
            initial={{ opacity: 0 }}
            animate={phase === "exit" ? { opacity: 0, scale: 0.985 } : { opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.45, ease: LUX_EASE }}
          >
            <div className={styles.backdrop}>
              <div className={styles.vignette} />
              <div className={styles.blobCyan} />
              <div className={styles.blobGold} />
              {shouldReduceMotion ? (
                <div className={styles.backdropSheenStatic} />
              ) : (
                <motion.div
                  className={styles.backdropSheen}
                  animate={{ x: ["-18%", "18%", "-18%"], opacity: [0.14, 0.3, 0.14] }}
                  transition={{ duration: 7.2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </div>

            <div className={styles.stage}>
              {!shouldReduceMotion ? (
                <div className={styles.ribbons}>
                  <motion.div
                    className={`${styles.ribbon} ${styles.ribbonA}`}
                    variants={{
                      intro: { x: "-130%", opacity: 0 },
                      reveal: {
                        x: ["-130%", "128%"],
                        opacity: [0, 0.44, 0],
                        transition: { duration: 1.05, ease: LUX_EASE },
                      },
                      assemble: {
                        x: ["128%", "-125%"],
                        opacity: [0, 0.3, 0],
                        transition: { duration: 0.98, ease: LUX_EASE },
                      },
                      impact: { opacity: 0 },
                      lock: { opacity: 0 },
                      exit: { opacity: 0 },
                    }}
                    initial="intro"
                    animate={phase}
                  />

                  <motion.div
                    className={`${styles.ribbon} ${styles.ribbonB}`}
                    variants={{
                      intro: { x: "120%", opacity: 0 },
                      reveal: {
                        x: ["120%", "-126%"],
                        opacity: [0, 0.34, 0],
                        transition: { duration: 1.1, delay: 0.08, ease: LUX_EASE },
                      },
                      assemble: {
                        x: ["-126%", "118%"],
                        opacity: [0, 0.24, 0],
                        transition: { duration: 0.9, ease: LUX_EASE },
                      },
                      impact: { opacity: 0 },
                      lock: { opacity: 0 },
                      exit: { opacity: 0 },
                    }}
                    initial="intro"
                    animate={phase}
                  />

                  <motion.div
                    className={`${styles.ribbon} ${styles.ribbonC}`}
                    variants={{
                      intro: { x: "-115%", opacity: 0 },
                      reveal: {
                        x: ["-115%", "102%"],
                        opacity: [0, 0.22, 0],
                        transition: { duration: 1.2, delay: 0.14, ease: LUX_EASE },
                      },
                      assemble: { x: "102%", opacity: 0 },
                      impact: { opacity: 0 },
                      lock: { opacity: 0 },
                      exit: { opacity: 0 },
                    }}
                    initial="intro"
                    animate={phase}
                  />
                </div>
              ) : null}

              <motion.div
                className={styles.logoWrap}
                variants={{
                  intro: { scale: 1.3, opacity: 0, y: 18, filter: "blur(11px)" },
                  reveal: {
                    scale: 1,
                    opacity: 1,
                    y: 0,
                    filter: "blur(0px)",
                    transition: { duration: shouldReduceMotion ? 0.12 : 0.8, ease: LUX_EASE },
                  },
                  assemble: { scale: 1, opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.24, ease: LUX_EASE } },
                  impact: {
                    scale: [1, 1.02, 1],
                    opacity: 1,
                    y: 0,
                    filter: "blur(0px)",
                    transition: { duration: shouldReduceMotion ? 0.1 : 0.36, ease: LUX_EASE },
                  },
                  lock: {
                    scale: [1, 1.015, 1],
                    opacity: 1,
                    y: 0,
                    filter: "blur(0px)",
                    transition: { duration: shouldReduceMotion ? 0.1 : 0.3, ease: LUX_EASE },
                  },
                  exit: {
                    scale: 0.98,
                    opacity: 0,
                    y: -6,
                    filter: "blur(0px)",
                    transition: { duration: 0.32, ease: LUX_EASE },
                  },
                }}
                initial="intro"
                animate={phase}
              >
                <motion.div
                  className={styles.logoBloom}
                  initial={{ opacity: 0.16, scale: 0.88 }}
                  animate={
                    phase === "reveal"
                      ? { opacity: [0.16, 0.62, 0.24], scale: [0.88, 1.14, 1] }
                      : phase === "impact"
                        ? { opacity: [0.24, 0.44, 0.24], scale: [1, 1.08, 1] }
                        : phase === "lock"
                          ? { opacity: [0.24, 0.36, 0.2], scale: [1, 1.04, 1] }
                          : { opacity: 0.2, scale: 1 }
                  }
                  transition={{ duration: shouldReduceMotion ? 0.12 : 0.7, ease: LUX_EASE }}
                />
                <Image src="/brand/logo.svg" alt="Laugh & Lodge" fill className={styles.logoImage} priority />
              </motion.div>

              <div className="mt-6 grid place-items-center">
                <div className={styles.exactLoader} role="status" aria-label="Loading" />
              </div>

              <div className={styles.footerHint}>Preparing your stay experience...</div>
              <div className={styles.progressTrack} aria-hidden>
                <motion.div
                  className={styles.progressBar}
                  initial={{ width: "0%" }}
                  animate={{ width: `${Math.round(progress * 100)}%` }}
                  transition={{ duration: 0.16, ease: "linear" }}
                />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {debugBadgeEnabled ? (
        <div className="pointer-events-none fixed left-2 top-2 z-[2147483647] rounded-md border border-black/15 bg-white/85 px-2 py-1 text-[11px] font-mono text-black shadow-sm backdrop-blur-sm">
          INTRO {loaderState}/{phase} | nav={navTypeDebug} | seen={seenFlag} | vis={visibilityState} | path={pathname} | t={elapsedMs}ms | m={mountStamp === null ? "-" : Math.round(mountStamp)} | h={hideStamp === null ? "-" : Math.round(hideStamp)}
        </div>
      ) : null}
    </>
  );
}
