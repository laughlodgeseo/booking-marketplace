"use client";
import { useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocale } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { gsap, useSceneMotion } from "./choreography";
const scenes = [
  {
    src: "/images/home/why-b.webp",
    en: "Time to do nothing.",
    ar: "وقت بلا عجلة.",
    body: "A morning with no agenda. Coffee, light, and a little space to yourself.",
    arBody: "صباح بلا مواعيد. قهوة وضوء ومساحة لنفسك.",
  },
  {
    src: "/images/owners/hero-4k/support_luxury_interior-4k.webp",
    en: "Somewhere to switch off.",
    ar: "مكان تستريح فيه.",
    body: "Close the door on a full day. Let the city wait until tomorrow.",
    arBody: "أغلق الباب على يوم حافل. ودع المدينة تنتظر حتى الغد.",
  },
  {
    src: "/images/home/interior-suite.webp",
    en: "A place of your own.",
    ar: "مساحتك الخاصة.",
    body: "More than somewhere to sleep. Somewhere to simply be.",
    arBody: "أكثر من مكان للنوم. مساحة تكون فيها على طبيعتك.",
  },
];
export default function RoomSequence() {
  const ar = useLocale() === "ar";
  const root = useRef<HTMLElement>(null);
  useSceneMotion(
    root,
    useCallback((mm) => {
      mm.add(
        "(min-width: 760px) and (prefers-reduced-motion: no-preference)",
        () => {
          const panels = gsap.utils.toArray<HTMLElement>(".v2-room-plane");
          gsap.set(panels.slice(1), {
            yPercent: 115,
            rotation: (i: number) => (i % 2 ? 4 : -4),
          });
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root.current,
              start: "top top",
              end: () => `+=${innerHeight * 2.3}`,
              pin: ".v2-rooms-stage",
              scrub: 0.7,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });
          panels.slice(1).forEach((panel, i) => {
            tl.to(
              panels[i],
              {
                scale: 0.88,
                rotation: i % 2 ? -3 : 3,
                opacity: 0.55,
                duration: 1,
              },
              i,
            )
              .to(
                panel,
                { yPercent: 0, rotation: 0, duration: 1, ease: "power2.inOut" },
                i,
              )
              .fromTo(
                panel.querySelector("img"),
                { scale: 1.22 },
                { scale: 1, duration: 1.25, ease: "none" },
                i,
              );
          });
        },
      );
      mm.add(
        "(max-width: 759px) and (prefers-reduced-motion: no-preference)",
        () => {
          gsap.utils
            .toArray<HTMLElement>(".v2-room-plane")
            .forEach((panel, i) => {
              gsap.fromTo(
                panel,
                { rotation: i % 2 ? 3 : -3, y: 60 },
                {
                  rotation: 0,
                  y: 0,
                  duration: 1.1,
                  ease: "power3.out",
                  scrollTrigger: { trigger: panel, start: "top 85%" },
                },
              );
            });
        },
      );
    }, []),
  );
  return (
    <section ref={root} className="v2-rooms">
      <div className="v2-rooms-stage">
        <h2>{ar ? "مساحة لتعيش بطريقتك." : "Not just a place. A feeling."}</h2>
        <div className="v2-room-deck">
          {scenes.map((scene, i) => (
            <article className="v2-room-plane" key={scene.src}>
              <div className="v2-room-photo">
                <Image
                  src={scene.src}
                  alt={ar ? scene.ar : scene.en}
                  fill
                  sizes="(max-width:760px) 90vw, 75vw"
                  className="object-cover"
                />
              </div>
              <div className="v2-room-description">
                <h3>{ar ? scene.ar : scene.en}</h3>
                <p>{ar ? scene.arBody : scene.body}</p>
                {i === 2 && (
                  <Link href="/gallery">
                    {ar ? "ألق نظرة بالداخل" : "Look inside"}
                    <ArrowUpRight size={20} />
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
