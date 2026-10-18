"use client";
import { useCallback, useRef, type ReactNode } from "react";
import { gsap, useSceneMotion } from "./choreography";

export default function EditorialDetails({
  children,
}: {
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  useSceneMotion(
    root,
    useCallback((mm) => {
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.utils
          .toArray<HTMLElement>(
            ".story-price-list section, .story-company-details, .story-contact-address, .story-gallery-study > .story-image, .story-gallery-study-grid > figure, .story-journal-post",
          )
          .forEach((el, i) => {
            gsap.from(el, {
              y: 55,
              opacity: 0.25,
              duration: 1,
              delay: (i % 2) * 0.1,
              ease: "power3.out",
              scrollTrigger: { trigger: el, start: "top 93%", once: true },
            });
          });
        gsap.utils
          .toArray<HTMLElement>(
            ".story-featured .story-stay, .story-inventory-image",
          )
          .forEach((el) => {
            gsap.fromTo(
              el,
              { clipPath: "inset(12% 5% 12% 5%)" },
              {
                clipPath: "inset(0% 0% 0% 0%)",
                ease: "none",
                scrollTrigger: {
                  trigger: el,
                  start: "top 95%",
                  end: "top 25%",
                  scrub: 0.7,
                },
              },
            );
          });
        gsap.utils
          .toArray<HTMLElement>(".story-next-route .story-link")
          .forEach((el) => {
            gsap.from(el, {
              x: 45,
              opacity: 0,
              duration: 0.85,
              ease: "power3.out",
              scrollTrigger: { trigger: el, start: "top 92%", once: true },
            });
          });
      });
    }, []),
  );
  return <div ref={root}>{children}</div>;
}
