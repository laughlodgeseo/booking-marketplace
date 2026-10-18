"use client";

import { useCallback, useId, useRef, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { ArrowLeft, ArrowRight, ArrowDown } from "lucide-react";
import { gsap, ScrollTrigger, useSceneMotion } from "./choreography";

/** One measured scroll clock for the track, photographs and progress line. */
export default function StoryRail({
  children,
  title,
  variant = "spaces",
}: {
  children: ReactNode;
  title: string;
  variant?: "spaces" | "owners" | "care";
}) {
  const ar = useLocale() === "ar";
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLSpanElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const endId = useId();
  useSceneMotion(
    root,
    useCallback(
      (mm) => {
        mm.add(
          "(min-width: 1000px) and (min-height: 580px) and (prefers-reduced-motion: no-preference)",
          () => {
            const rail = track.current;
            const view = viewport.current;
            if (!rail || !view) return;
            if (variant === "care") {
              const panels = Array.from(rail.children);
              gsap.set(panels.slice(1), { yPercent: 115 });
              const sequence = gsap.timeline({
                scrollTrigger: {
                  trigger: root.current,
                  start: "top top",
                  end: () => `+=${innerHeight * (panels.length - 1) * 1.1}`,
                  pin: true,
                  scrub: 0.65,
                  anticipatePin: 1,
                  invalidateOnRefresh: true,
                  onUpdate: (self) => {
                    if (progress.current)
                      progress.current.style.transform = `scaleX(${0.06 + self.progress * 0.94})`;
                  },
                },
              });
              panels.forEach((panel, index) => {
                if (!index) return;
                sequence
                  .to(
                    panels[index - 1],
                    { scale: 0.94, opacity: 0.4, duration: 1 },
                    index - 1,
                  )
                  .to(
                    panel,
                    { yPercent: 0, ease: "power2.inOut", duration: 1 },
                    index - 1,
                  );
              });
              trigger.current = sequence.scrollTrigger || null;
              return () => {
                trigger.current = null;
              };
            }
            const distance = () =>
              Math.max(0, rail.scrollWidth - view.clientWidth);
            const tween = gsap.to(rail, {
              x: () => (ar ? 1 : -1) * distance(),
              ease: "none",
              scrollTrigger: {
                trigger: root.current,
                start: "top top",
                end: () => `+=${distance()}`,
                pin: true,
                scrub: 0.6,
                anticipatePin: 1,
                invalidateOnRefresh: true,
                onUpdate: (self) => {
                  if (progress.current)
                    progress.current.style.transform = `scaleX(${0.06 + self.progress * 0.94})`;
                },
              },
            });
            trigger.current = tween.scrollTrigger || null;
            Array.from(rail.children).forEach((panel) => {
              const photo = panel.querySelector(".story-image img");
              if (photo)
                gsap.fromTo(
                  photo,
                  { xPercent: ar ? 5 : -5, scale: 1.13 },
                  {
                    xPercent: ar ? -5 : 5,
                    ease: "none",
                    scrollTrigger: {
                      trigger: panel,
                      containerAnimation: tween,
                      start: "left right",
                      end: "right left",
                      scrub: true,
                    },
                  },
                );
            });
            return () => {
              trigger.current = null;
            };
          },
        );
      },
      [ar, variant],
    ),
  );
  function moveTo(index: number, immediate = false) {
    const panel = track.current?.children[index] as HTMLElement | undefined;
    const view = viewport.current;
    const rail = track.current;
    if (!panel || !view || !rail) return;
    const t = trigger.current;
    if (t) {
      const offset = Math.abs(
        panel.offsetLeft - (rail.children[0] as HTMLElement).offsetLeft,
      );
      const ratio =
        variant === "care"
          ? index / Math.max(1, rail.children.length - 1)
          : Math.min(
              1,
              offset / Math.max(1, rail.scrollWidth - view.clientWidth),
            );
      window.dispatchEvent(
        new CustomEvent("story:scroll", {
          detail: { top: t.start + ratio * (t.end - t.start), immediate },
        }),
      );
    } else {
      const delta =
        panel.getBoundingClientRect().left - view.getBoundingClientRect().left;
      view.scrollBy({
        left: delta,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    }
  }
  function step(direction: number) {
    const t = trigger.current;
    const count = track.current?.children.length || 1;
    if (t) {
      const next = Math.max(
        0,
        Math.min(1, t.progress + direction / Math.max(1, count - 1)),
      );
      window.dispatchEvent(
        new CustomEvent("story:scroll", {
          detail: { top: t.start + next * (t.end - t.start) },
        }),
      );
    } else
      viewport.current?.scrollBy({
        left: direction * (ar ? -1 : 1) * viewport.current.clientWidth * 0.88,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  }
  return (
    <>
      <section
        ref={root}
        className={`v3-rail v3-rail-${variant}`}
        aria-label={title}
      >
        <div className="v3-rail-heading">
          <h2>{title}</h2>
          <div className="v3-rail-controls">
            <a
              href={`#${endId}`}
              className="v3-rail-skip"
              onClick={(e) => {
                if (!trigger.current) return;
                e.preventDefault();
                window.dispatchEvent(
                  new CustomEvent("story:scroll", {
                    detail: { top: trigger.current.end + 1, immediate: true },
                  }),
                );
                document.getElementById(endId)?.focus({ preventScroll: true });
              }}
            >
              {ar ? "تابع أدناه" : "Continue below"}
              <ArrowDown size={16} />
            </a>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={ar ? "السابق" : "Previous scene"}
            >
              <ArrowLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label={ar ? "التالي" : "Next scene"}
            >
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
        <div ref={viewport} className="v3-rail-window">
          <div
            ref={track}
            className="v3-rail-track"
            onFocusCapture={(event) => {
              if (
                !(event.target instanceof HTMLElement) ||
                !event.target.matches(":focus-visible")
              )
                return;
              const panel = Array.from(event.currentTarget.children).findIndex(
                (child) => child.contains(event.target),
              );
              if (panel >= 0 && trigger.current) moveTo(panel, true);
            }}
          >
            {children}
          </div>
        </div>
        <div className="v3-rail-progress" aria-hidden>
          <span ref={progress} />
        </div>
      </section>
      <div id={endId} tabIndex={-1} className="v3-rail-end" />
    </>
  );
}
