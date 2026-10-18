"use client";

import { useRef, useCallback, type ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import Image from "next/image";
import { gsap, useSceneMotion } from "./choreography";
import { usePathname } from "next/navigation";
import EditorialDetails from "./EditorialDetails";

export function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useSceneMotion(
    ref,
    useCallback((mm) => {
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ref.current,
          { clipPath: "inset(0% 0% 100% 0%)", y: 65 },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            y: 0,
            duration: 1.15,
            ease: "power4.out",
            scrollTrigger: {
              trigger: ref.current,
              start: "top 94%",
              once: true,
            },
          },
        );
      });
    }, []),
  );
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

export function SceneImage({
  src,
  alt,
  className = "",
  priority = false,
  sizes = "100vw",
  continuityKey,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  continuityKey?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-5%", "5%"]);
  return (
    <div
      ref={ref}
      className={`story-image ${className}`}
      data-stay-cover={continuityKey}
    >
      <motion.div className="story-image-inner" style={{ y: reduced ? 0 : y }}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </motion.div>
    </div>
  );
}

export function RouteArrival({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="story-route">
      <EditorialDetails>{children}</EditorialDetails>
    </div>
  );
}
