"use client";
import { useCallback, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { gsap, useSceneMotion } from "./choreography";
import ScrollWords from "./ScrollWords";

export type Scene = {
  title: string;
  body: string;
  src: string;
  alt: string;
  href?: string;
  label?: string;
};
export function ImageHandoff({ scenes }: { scenes: [Scene, Scene] }) {
  const root = useRef<HTMLElement>(null);
  useSceneMotion(
    root,
    useCallback((mm) => {
      mm.add(
        "(min-width:1000px) and (min-height:580px) and (prefers-reduced-motion:no-preference)",
        () => {
          const incoming = root.current?.querySelector(
            ".v4-handoff-scene:last-child",
          );
          const outgoing = root.current?.querySelector(
            ".v4-handoff-scene:first-child",
          );
          if (!incoming || !outgoing) return;
          gsap.set(".v4-handoff-stage", { height: "100svh" });
          gsap.set(".v4-handoff-scene", {
            position: "absolute",
            inset: 0,
            height: "100%",
          });
          gsap.set(incoming, { clipPath: "inset(100% 0% 0% 0%)" });
          const sequence = gsap.timeline({
            scrollTrigger: {
              trigger: root.current,
              pin: ".v4-handoff-stage",
              start: "top top",
              end: () => `+=${innerHeight * 1.1}`,
              scrub: 0.7,
              invalidateOnRefresh: true,
              anticipatePin: 1,
            },
          });
          sequence
            .to(
              outgoing.querySelector("img"),
              { scale: 1.18, yPercent: -8, duration: 1.1, ease: "none" },
              0,
            )
            .to(
              outgoing.querySelector(".v4-handoff-copy"),
              { yPercent: -40, opacity: 0, duration: 0.5 },
              0.15,
            )
            .to(
              incoming,
              {
                clipPath: "inset(0% 0% 0% 0%)",
                duration: 0.85,
                ease: "power2.inOut",
              },
              0.2,
            )
            .fromTo(
              incoming.querySelector("img"),
              { scale: 1.25, yPercent: 8 },
              { scale: 1, yPercent: 0, duration: 1, ease: "none" },
              0.2,
            )
            .from(
              incoming.querySelector(".v4-handoff-copy"),
              { y: 100, opacity: 0, duration: 0.45, ease: "power3.out" },
              0.75,
            );
        },
      );
    }, []),
  );
  return (
    <section ref={root} className="v4-handoff">
      <div className="v4-handoff-stage">
        {scenes.map((scene, index) => (
          <article className="v4-handoff-scene" key={scene.src}>
            <Image
              src={scene.src}
              alt={scene.alt}
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div className="v4-handoff-shade" />
            <div className="v4-handoff-copy">
              {index === 0 ? <h2>{scene.title}</h2> : <h3>{scene.title}</h3>}
              <p>{scene.body}</p>
              {scene.href && (
                <Link className="story-link" href={scene.href}>
                  {scene.label}
                  <ArrowUpRight size={20} />
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PhotoEssay({
  title,
  body,
  photos,
  dark = false,
}: {
  title: string;
  body: string[];
  photos: { src: string; alt: string }[];
  dark?: boolean;
}) {
  const root = useRef<HTMLElement>(null);
  useSceneMotion(
    root,
    useCallback((mm) => {
      mm.add("(prefers-reduced-motion:no-preference)", () => {
        gsap.utils
          .toArray<HTMLElement>(".v4-essay-photo")
          .forEach((frame, index) => {
            gsap.fromTo(
              frame,
              { y: index % 2 ? 95 : -35, rotation: index % 2 ? 3 : -2 },
              {
                y: index % 2 ? -85 : 30,
                rotation: 0,
                ease: "none",
                scrollTrigger: {
                  trigger: root.current,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 0.8,
                },
              },
            );
            gsap.fromTo(
              frame.querySelector("img"),
              { scale: 1.18 },
              {
                scale: 1,
                ease: "none",
                scrollTrigger: {
                  trigger: frame,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 0.6,
                },
              },
            );
            gsap.from(frame.querySelector(".v4-essay-crop"), {
              clipPath: "inset(0% 0% 100% 0%)",
              duration: 1.2,
              ease: "power3.inOut",
              scrollTrigger: { trigger: frame, start: "top 92%", once: true },
            });
          });
      });
    }, []),
  );
  return (
    <section ref={root} className={`v4-photo-essay ${dark ? "v4-dark" : ""}`}>
      <ScrollWords text={title} />
      <div className="v4-essay-field">
        {photos.map((photo) => (
          <figure className="v4-essay-photo" key={photo.src}>
            <div className="v4-essay-crop">
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(max-width:759px) 80vw, 46vw"
                className="object-cover"
              />
            </div>
          </figure>
        ))}
      </div>
      <div className="v4-essay-copy">
        {body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}

export function PracticalSteps({
  title,
  intro,
  items,
}: {
  title: string;
  intro: string;
  items: Scene[];
}) {
  const root = useRef<HTMLElement>(null);
  useSceneMotion(
    root,
    useCallback((mm) => {
      mm.add("(prefers-reduced-motion:no-preference)", () => {
        gsap.utils.toArray<HTMLElement>(".v4-practical-row").forEach((row) => {
          gsap.from(row.querySelector(".v4-practical-line"), {
            scaleX: 0,
            duration: 1.2,
            ease: "power3.inOut",
            scrollTrigger: { trigger: row, start: "top 85%", once: true },
          });
          gsap.fromTo(
            row.querySelector(".v4-practical-photo"),
            { clipPath: "inset(0% 40% 0% 40%)" },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              ease: "power2.inOut",
              scrollTrigger: {
                trigger: row,
                start: "top 95%",
                end: "top 30%",
                scrub: 0.6,
              },
            },
          );
          gsap.from(row.querySelector("h3"), {
            x: -45,
            opacity: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: { trigger: row, start: "top 85%", once: true },
          });
        });
      });
    }, []),
  );
  return (
    <section ref={root} className="v4-practical">
      <div className="v4-practical-intro">
        <ScrollWords text={title} />
        <p>{intro}</p>
      </div>
      <div className="v4-practical-rows">
        {items.map((item) => (
          <article className="v4-practical-row" key={item.title}>
            <span className="v4-practical-line" aria-hidden />
            <h3>{item.title}</h3>
            <div className="v4-practical-photo">
              <Image
                src={item.src}
                alt={item.alt}
                fill
                sizes="(max-width:759px) 90vw, 30vw"
                className="object-cover"
              />
            </div>
            <div className="v4-practical-copy">
              <p>{item.body}</p>
              {item.href && (
                <Link className="story-link" href={item.href}>
                  {item.label}
                  <ArrowUpRight size={18} />
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function StaySelector({
  title,
  choices,
}: {
  title: string;
  choices: Scene[];
}) {
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const scene = choices[active];
  return (
    <section className="v4-selector">
      <ScrollWords text={title} />
      <div className="v4-selector-frame">
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            className="v4-selector-scene"
            key={scene.src}
            initial={{
              clipPath: reduced ? "inset(0%)" : "inset(0% 0% 100% 0%)",
            }}
            animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
            exit={{ opacity: 0 }}
            transition={{
              duration: reduced ? 0 : 0.8,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Image
              src={scene.src}
              alt={scene.alt}
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div className="v4-selector-shade" />
            <div className="v4-selector-copy">
              <h3>{scene.title}</h3>
              <p>{scene.body}</p>
              {scene.href && (
                <Link className="story-link" href={scene.href}>
                  {scene.label}
                  <ArrowUpRight size={19} />
                </Link>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="v4-selector-options" role="group" aria-label={title}>
        {choices.map((choice, index) => (
          <button
            type="button"
            key={choice.title}
            aria-pressed={active === index}
            onClick={() => setActive(index)}
          >
            {choice.title}
            <ArrowUpRight size={22} />
          </button>
        ))}
      </div>
    </section>
  );
}

export function EditorialFaq({
  title,
  items,
}: {
  title: string;
  items: { q: string; a: string }[];
}) {
  return (
    <section className="v4-faq">
      <ScrollWords text={title} />
      <div>
        {items.map((item) => (
          <details key={item.q}>
            <summary>
              {item.q}
              <Plus size={22} />
            </summary>
            <div className="v4-faq-answer">
              <p>{item.a}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

export function ParallaxCards({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useSceneMotion(
    root,
    useCallback((mm) => {
      mm.add(
        "(min-width:760px) and (prefers-reduced-motion:no-preference)",
        () => {
          gsap.utils
            .toArray<HTMLElement>(".v4-reading-card")
            .forEach((card, index) => {
              gsap.fromTo(
                card,
                { y: index % 2 ? 80 : -20 },
                {
                  y: index % 2 ? -60 : 30,
                  ease: "none",
                  scrollTrigger: {
                    trigger: root.current,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 0.8,
                  },
                },
              );
            });
        },
      );
    }, []),
  );
  return (
    <div ref={root} className="v4-reading-cards">
      {children}
    </div>
  );
}
