"use client";
import { useCallback, useRef } from "react";
import { gsap, useSceneMotion } from "./choreography";

export default function ScrollWords({
  text,
  as: Tag = "h2",
}: {
  text: string;
  as?: "h2" | "p";
}) {
  const root = useRef<HTMLDivElement>(null);
  useSceneMotion(
    root,
    useCallback((mm) => {
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".v3-sweep-word",
          { opacity: 0.22, yPercent: 30 },
          {
            opacity: 1,
            yPercent: 0,
            stagger: 0.08,
            ease: "none",
            scrollTrigger: {
              trigger: root.current,
              start: "top 90%",
              end: "bottom 55%",
              scrub: 0.5,
            },
          },
        );
      });
    }, []),
  );
  return (
    <div ref={root} className="v3-word-sweep">
      <Tag aria-label={text}>
        {text.split(" ").map((word, i) => (
          <span className="v3-sweep-word" aria-hidden key={i}>
            {word}{" "}
          </span>
        ))}
      </Tag>
    </div>
  );
}
