"use client";
import { useCallback, useRef } from "react";
import Image from "next/image";
import { gsap, useSceneMotion } from "./choreography";
export default function RouteHero({
  title,
  intro,
  src,
  alt,
  mode,
}: {
  title: string;
  intro: string;
  src: string;
  alt: string;
  mode: "services" | "owners" | "about";
}) {
  const root = useRef<HTMLElement>(null);
  useSceneMotion(
    root,
    useCallback(
      (mm) => {
        mm.add("(prefers-reduced-motion: no-preference)", () => {
          gsap.from(".v2-word-mask>span", {
            yPercent: 115,
            rotation: 3,
            stagger: 0.035,
            duration: 1.15,
            ease: "power4.out",
            delay: 0.05,
          });
          if (mode === "about") {
            gsap.from(".v2-route-slice", {
              yPercent: (i: number) => (i % 2 ? 35 : -35),
              clipPath: "inset(25% 0 25% 0)",
              stagger: 0.12,
              duration: 1.4,
              ease: "power3.out",
            });
            gsap.utils
              .toArray<HTMLElement>(".v2-route-slice")
              .forEach((el, i) =>
                gsap.to(el, {
                  yPercent: i % 2 ? -14 : 14,
                  ease: "none",
                  scrollTrigger: {
                    trigger: root.current,
                    start: "top top",
                    end: "bottom top",
                    scrub: 0.7,
                  },
                }),
              );
          } else {
            gsap.fromTo(
              ".v2-route-visual",
              {
                clipPath:
                  mode === "owners"
                    ? "inset(5% 28% 5% 28%)"
                    : "inset(0% 50% 0% 50%)",
                rotation: mode === "owners" ? -4 : 0,
              },
              {
                clipPath: "inset(0% 0% 0% 0%)",
                rotation: 0,
                duration: 1.5,
                ease: "power3.inOut",
              },
            );
            gsap.to(".v2-route-visual img", {
              yPercent: 10,
              scale: 1.08,
              ease: "none",
              scrollTrigger: {
                trigger: root.current,
                start: "top top",
                end: "bottom top",
                scrub: 0.6,
              },
            });
          }
        });
      },
      [mode],
    ),
  );
  return (
    <section ref={root} className={`v2-route-hero v2-route-hero-${mode}`}>
      <h1 className="v2-route-headline">
        {title.split(" ").map((word, i) => (
          <span className="v2-word-mask" key={i}>
            <span>{word}&nbsp;</span>
          </span>
        ))}
      </h1>
      {mode === "about" ? (
        <div className="v2-route-panorama">
          {[0, 1, 2].map((i) => (
            <div className="v2-route-slice" key={i}>
              <Image
                src={src}
                alt={i === 0 ? alt : ""}
                fill
                priority
                sizes="100vw"
                className="object-cover"
                style={{ objectPosition: `${i * 50}% center` }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="v2-route-visual">
          <Image
            src={src}
            alt={alt}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
      )}
      <p className="v2-route-intro">{intro}</p>
    </section>
  );
}
