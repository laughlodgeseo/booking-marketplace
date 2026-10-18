"use client";
import { Suspense, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLocale } from "next-intl";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import UnifiedSearchBar from "@/components/search/UnifiedSearchBar";
import { gsap, ScrollTrigger, useSceneMotion } from "./choreography";

const districts = [
  {
    slug: "dubai-marina",
    name: "Dubai Marina",
    ar: "دبي مارينا",
    line: "The city, reflected.",
    arLine: "المدينة تنعكس على الماء.",
    body: "Waterfront walks. Late dinners. A skyline that stays with you.",
    arBody: "ممشى على الواجهة البحرية، وعشاء متأخر، وأفق لا يُنسى.",
  },
  {
    slug: "downtown-dubai",
    name: "Downtown Dubai",
    ar: "وسط مدينة دبي",
    line: "At the heart of it.",
    arLine: "في قلب المدينة.",
    body: "The landmarks you came to see. A neighborhood to come home to.",
    arBody: "معالم جئت لرؤيتها وحيّ تعود إليه كأنك في بيتك.",
  },
  {
    slug: "palm-jumeirah",
    name: "Palm Jumeirah",
    ar: "نخلة جميرا",
    line: "A different pace.",
    arLine: "إيقاع مختلف.",
    body: "Sea air, open horizons, and room to take your time.",
    arBody: "هواء البحر وآفاق مفتوحة ومساحة لتأخذ وقتك.",
  },
  {
    slug: "jbr",
    name: "JBR",
    ar: "جميرا بيتش ريزيدنس",
    line: "Life by the water.",
    arLine: "الحياة بجانب البحر.",
    body: "Morning coffee, an open promenade, and the beach around the corner.",
    arBody: "قهوة الصباح وممشى مفتوح والشاطئ قريب منك.",
  },
];
export function HomeOpening() {
  const ar = useLocale() === "ar";
  const root = useRef<HTMLElement>(null);
  useSceneMotion(
    root,
    useCallback((mm) => {
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const mobile = innerWidth < 760;
        gsap.from(".v2-hero-cityword", {
          clipPath: "inset(100% 0% 0% 0%)",
          duration: 1.25,
          ease: "power4.out",
          delay: 0.1,
        });
        gsap.from(".v2-hero-room", {
          opacity: 0,
          duration: 1.25,
          ease: "power3.out",
          delay: 0.25,
        });
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            pin: !mobile,
            start: "top top",
            end: () => (mobile ? "bottom top" : `+=${innerHeight * 1.25}`),
            scrub: 0.65,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
        timeline
          .to(
            ".v2-hero-city",
            { scale: 1.14, yPercent: -12, ease: "none", duration: 1 },
            0,
          )
          .to(
            ".v2-hero-letter",
            {
              yPercent: -145,
              xPercent: (i: number) => (i - 2) * 15,
              stagger: 0.018,
              ease: "power1.in",
              duration: 0.48,
            },
            0,
          )
          .to(
            ".v2-hero-tagline",
            { yPercent: 120, opacity: 0, duration: 0.25 },
            0.08,
          )
          .to(
            ".v2-hero-room",
            {
              clipPath: "inset(0% 0% 0% 0%)",
              scale: 1,
              ease: "power2.inOut",
              duration: 0.85,
            },
            0.05,
          )
          .fromTo(
            ".v2-hero-room img",
            { scale: 1.16 },
            { scale: 1, ease: "none", duration: 1 },
            0,
          )
          .fromTo(
            ".v2-hero-arrival span",
            { yPercent: 115 },
            { yPercent: 0, stagger: 0.08, duration: 0.35, ease: "power3.out" },
            0.6,
          )
          .to(".v2-hero-arrival", { yPercent: -15, duration: 0.2 }, 0.95);
      });
    }, []),
  );
  return (
    <>
      <section ref={root} className="v2-hero">
        <div className="v2-hero-stage">
          <div className="v2-hero-city">
            <Image
              src="/images/home/dubai-skyline.webp"
              alt={ar ? "أفق دبي" : "Dubai’s skyline in the evening light"}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
          <h1
            className="v2-hero-title"
            aria-label={ar ? "دبي، من الداخل." : "Dubai, from the inside."}
          >
            <span className="v2-hero-cityword" aria-hidden>
              {(ar ? ["د", "ب", "ي"] : ["D", "U", "B", "A", "I"]).map(
                (letter, i) => (
                  <span className="v2-hero-letter" key={i}>
                    {letter}
                  </span>
                ),
              )}
            </span>
            <span className="v2-hero-tagline" aria-hidden>
              {ar ? "من الداخل." : "from the inside."}
            </span>
          </h1>
          <div className="v2-hero-room">
            <Image
              src="/images/home/interior-suite.webp"
              alt={
                ar
                  ? "غرفة تفتح على الضوء"
                  : "An interior opening onto the light"
              }
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
          <div className="v2-hero-arrival" aria-hidden>
            <div>
              <span>{ar ? "افتح الباب." : "Open the door."}</span>
            </div>
            <div>
              <span>{ar ? "اجعلها إقامتك." : "Make it yours."}</span>
            </div>
          </div>
          <div className="v2-hero-actions">
            <a href="#find-your-stay">
              {ar ? "ابحث عن إقامتك" : "Find your stay"}
              <ArrowDown size={18} />
            </a>
            <Link
              href="/properties"
              aria-label={ar ? "استكشف الإقامات" : "Explore stays"}
            >
              <ArrowUpRight size={25} />
            </Link>
          </div>
        </div>
      </section>
      <section className="v2-search-section" id="find-your-stay">
        <h2>{ar ? "أين تأخذك المدينة؟" : "Where will the city take you?"}</h2>
        <Suspense
          fallback={
            <div className="story-search-loading">
              {ar ? "ابحث عن إقامتك" : "Find your stay"}
            </div>
          }
        >
          <UnifiedSearchBar variant="home" />
        </Suspense>
      </section>
    </>
  );
}
export function CityJourney() {
  const ar = useLocale() === "ar";
  const root = useRef<HTMLElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const progress = useRef<HTMLSpanElement>(null);
  useSceneMotion(
    root,
    useCallback(
      (mm) => {
        mm.add(
          "(min-width: 1000px) and (prefers-reduced-motion: no-preference)",
          () => {
            const track = rail.current;
            if (!track) return;
            const travel = () => Math.max(0, track.scrollWidth - innerWidth);
            const tween = gsap.to(track, {
              x: () => (ar ? travel() : -travel()),
              ease: "none",
              scrollTrigger: {
                trigger: root.current,
                start: "top top",
                end: () => `+=${travel() * 0.95}`,
                pin: true,
                scrub: 0.45,
                anticipatePin: 1,
                invalidateOnRefresh: true,
                onUpdate: (self) => {
                  if (progress.current)
                    progress.current.style.transform = `scaleX(${0.12 + self.progress * 0.88})`;
                },
              },
            });
            trigger.current = tween.scrollTrigger || null;
            gsap.utils
              .toArray<HTMLElement>(".v2-district-photo img")
              .forEach((image, i) =>
                gsap.fromTo(
                  image,
                  { xPercent: i % 2 ? 8 : -6, scale: 1.12 },
                  {
                    xPercent: i % 2 ? -8 : 6,
                    ease: "none",
                    scrollTrigger: {
                      trigger: root.current,
                      start: "top top",
                      end: () => `+=${travel() * 0.95}`,
                      scrub: 0.7,
                    },
                  },
                ),
              );
            return () => {
              trigger.current = null;
            };
          },
        );
      },
      [ar],
    ),
  );
  function go(direction: number) {
    const t = trigger.current;
    if (t) {
      const next = Math.max(
        0,
        Math.min(1, t.progress + direction / (districts.length - 1)),
      );
      window.dispatchEvent(
        new CustomEvent("story:scroll", {
          detail: { top: t.start + (t.end - t.start) * next },
        }),
      );
    } else
      rail.current?.scrollBy({
        left: direction * (ar ? -1 : 1) * innerWidth * 0.85,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  }
  function focus(index: number) {
    const t = trigger.current;
    if (t)
      window.dispatchEvent(
        new CustomEvent("story:scroll", {
          detail: {
            top: t.start + (t.end - t.start) * (index / (districts.length - 1)),
            immediate: true,
          },
        }),
      );
  }
  return (
    <section ref={root} className="v2-city" id="the-city">
      <div className="v2-city-stage">
        <div className="v2-city-top">
          <h2>
            {ar ? (
              <>
                اختر إيقاعك.
                <br />
                اختر حيّك.
              </>
            ) : (
              <>
                Find your rhythm.
                <br />
                Find your neighborhood.
              </>
            )}
          </h2>
          <div className="v2-city-controls">
            <button
              onClick={() => go(-1)}
              aria-label={ar ? "الحي السابق" : "Previous neighborhood"}
            >
              <ArrowLeft />
            </button>
            <button
              onClick={() => go(1)}
              aria-label={ar ? "الحي التالي" : "Next neighborhood"}
            >
              <ArrowRight />
            </button>
          </div>
        </div>
        <div className="v2-city-window">
          <div
            ref={rail}
            className="v2-city-track"
            aria-label={ar ? "أحياء دبي" : "Dubai neighborhoods"}
          >
            {districts.map((area, i) => (
              <Link
                className={`v2-district v2-district-${i}`}
                key={area.slug}
                onFocus={() => focus(i)}
                href={`/properties?q=${encodeURIComponent(area.name)}`}
              >
                <div className="v2-district-photo">
                  <Image
                    src={`/areas/${area.slug}.webp`}
                    alt={ar ? area.ar : area.name}
                    fill
                    sizes="(max-width:1000px) 88vw, 52vw"
                    className="object-cover"
                  />
                  <span className="v2-district-name">
                    {ar ? area.ar : area.name}
                  </span>
                  <ArrowUpRight />
                </div>
                <div className="v2-district-copy">
                  <h3>{ar ? area.arLine : area.line}</h3>
                  <p>{ar ? area.arBody : area.body}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <div className="v2-city-bottom">
          <div className="v2-city-progress">
            <span ref={progress} />
          </div>
          <Link href="/properties">
            {ar ? "كل الإقامات" : "See all stays"}
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
export function HomeCare() {
  const ar = useLocale() === "ar";
  const root = useRef<HTMLDivElement>(null);
  useSceneMotion(
    root,
    useCallback((mm) => {
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".v2-care-sentence span",
          { color: "#a6b2ab" },
          {
            color: "#1e2625",
            stagger: 0.12,
            ease: "none",
            scrollTrigger: {
              trigger: ".v2-care-sentence",
              start: "top 80%",
              end: "bottom 40%",
              scrub: 0.4,
            },
          },
        );
        gsap.fromTo(
          ".v2-care-strip",
          { xPercent: -12, rotation: -5 },
          {
            xPercent: 6,
            rotation: 3,
            ease: "none",
            scrollTrigger: {
              trigger: ".v2-care",
              start: "top bottom",
              end: "bottom top",
              scrub: 0.7,
            },
          },
        );
        gsap.fromTo(
          ".v2-owner-image",
          { clipPath: "inset(12% 20% 12% 20%)" },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            ease: "power2.inOut",
            scrollTrigger: {
              trigger: ".v2-owner",
              start: "top 85%",
              end: "top 10%",
              scrub: 0.6,
            },
          },
        );
        gsap.fromTo(
          ".v2-owner-title span",
          { yPercent: 100 },
          {
            yPercent: 0,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: { trigger: ".v2-owner", start: "top 50%" },
            duration: 1.1,
          },
        );
      });
    }, []),
  );
  const words = (
    ar
      ? "الإقامة الجميلة تبدأ بالتفاصيل الصغيرة."
      : "A great stay begins long before you arrive."
  ).split(" ");
  return (
    <div ref={root}>
      <section className="v2-care">
        <h2 className="v2-care-sentence">
          {words.map((word, i) => (
            <span key={i}>{word} </span>
          ))}
        </h2>
        <div className="v2-care-strip">
          <Image
            src="/images/owners/hero-4k/support_luxury_interior-4k.webp"
            alt={
              ar
                ? "تفاصيل غرفة النوم"
                : "The quiet details of a prepared bedroom"
            }
            fill
            sizes="80vw"
            className="object-cover"
          />
        </div>
        <div className="v2-care-note">
          <p>
            {ar
              ? "من الغرفة التي تعود إليها إلى التفاصيل التي تمنحك الراحة. العناية جزء من الإقامة."
              : "The room you return to. The linen you sink into. The small things that let you simply be here."}
          </p>
          <Link className="story-link" href="/services">
            {ar ? "العناية وراء إقامتك" : "The care behind your stay"}
            <ArrowUpRight size={20} />
          </Link>
        </div>
      </section>
      <section className="v2-owner">
        <div className="v2-owner-image">
          <Image
            src="/images/owners/hero-4k/main_business_bay-4k.webp"
            alt={
              ar
                ? "عقارات دبي وقت الغروب"
                : "Dubai’s residential skyline at dusk"
            }
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <h2 className="v2-owner-title">
          <div>
            <span>{ar ? "مساحتك." : "Your space."}</span>
          </div>
          <div>
            <span>{ar ? "قصتها القادمة." : "Its next chapter."}</span>
          </div>
        </h2>
        <div className="v2-owner-note">
          <p>
            {ar
              ? "يرى ضيوفك إقامة مميزة. وترى أنت بيتاً يستحق العناية."
              : "Your guests see a beautiful stay. You see a home with potential. Let’s bring the two together."}
          </p>
          <Link className="story-link" href="/owners">
            {ar ? "لأصحاب العقارات" : "For property owners"}
            <ArrowUpRight size={20} />
          </Link>
        </div>
      </section>
    </div>
  );
}
