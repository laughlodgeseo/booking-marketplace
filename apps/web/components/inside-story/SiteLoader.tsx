"use client";
import { useLayoutEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { gsap } from "./choreography";

export default function SiteLoader() {
  const root = useRef<HTMLDivElement>(null);
  const ar = useLocale() === "ar";
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    let cancelled = false;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = gsap.context(() => {
      if (reduced) return;
      gsap.from(".v4-loader-word span", {
        yPercent: 110,
        stagger: 0.05,
        duration: 0.8,
        ease: "power4.out",
      });
      gsap.fromTo(
        ".v4-loader-door",
        { scaleY: 0.08 },
        { scaleY: 1, duration: 0.9, ease: "power3.inOut" },
      );
      gsap.to(".v4-loader-line span", {
        scaleX: 0.85,
        duration: 1.8,
        ease: "power2.out",
      });
    }, el);
    let timeout: ReturnType<typeof setTimeout>;
    const deadline = new Promise<void>((resolve) => {
      timeout = setTimeout(resolve, 2800);
    });
    const ready = Promise.all([
      document.fonts.ready,
      ...Array.from(document.images)
        .filter(
          (image) =>
            image.loading === "eager" || image.fetchPriority === "high",
        )
        .map((image) => image.decode().catch(() => undefined)),
    ]);
    const minimum = new Promise<void>((resolve) =>
      setTimeout(resolve, reduced ? 100 : 700),
    );
    void Promise.all([minimum, Promise.race([ready, deadline])]).then(() => {
      clearTimeout(timeout);
      if (cancelled) return;
      gsap
        .timeline({
          onComplete: () => {
            el.hidden = true;
            window.dispatchEvent(new Event("story:ready"));
          },
        })
        .to(el.querySelector(".v4-loader-line span"), {
          scaleX: 1,
          duration: 0.18,
        })
        .to(el.querySelector(".v4-loader-content"), {
          opacity: 0,
          y: -20,
          duration: reduced ? 0 : 0.3,
        })
        .to(
          el.querySelectorAll(".v4-loader-panel"),
          {
            scaleX: 0,
            stagger: 0.045,
            duration: reduced ? 0.1 : 0.65,
            ease: "power3.inOut",
          },
          "<",
        )
        .set(el, { visibility: "hidden" });
    });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      context.revert();
      gsap.killTweensOf(el.querySelectorAll("*"));
    };
  }, []);
  return (
    <div
      ref={root}
      className="v4-loader"
      role="status"
      aria-label={ar ? "جارٍ فتح الموقع" : "Opening Laugh & Lodge"}
    >
      <i className="v4-loader-panel" />
      <i className="v4-loader-panel" />
      <div className="v4-loader-content">
        <div className="v4-loader-door" aria-hidden>
          <span />
        </div>
        <div className="v4-loader-word" aria-hidden>
          {["laugh", "&", "lodge."].map((word) => (
            <span key={word}>{word}</span>
          ))}
        </div>
        <div className="v4-loader-line" aria-hidden>
          <span />
        </div>
        <p>{ar ? "إقامتك تبدأ من هنا." : "A little closer to your stay."}</p>
      </div>
    </div>
  );
}
