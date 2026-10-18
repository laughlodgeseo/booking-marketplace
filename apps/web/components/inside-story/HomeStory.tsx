"use client";
import {
  Suspense,
  useRef,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useLocale } from "next-intl";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  useMotionValueEvent,
} from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import UnifiedSearchBar from "@/components/search/UnifiedSearchBar";
import { Reveal, SceneImage } from "./Motion";

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
    body: "Landmark views and the energy of a city always in motion.",
    arBody: "إطلالات على المعالم وحيوية مدينة لا تتوقف.",
  },
  {
    slug: "palm-jumeirah",
    name: "Palm Jumeirah",
    ar: "نخلة جميرا",
    line: "A different pace.",
    arLine: "إيقاع مختلف.",
    body: "Sea air, open horizons, and a little more room to unwind.",
    arBody: "هواء البحر وآفاق مفتوحة ومساحة للاسترخاء.",
  },
  {
    slug: "jbr",
    name: "Jumeirah Beach Residence",
    ar: "جميرا بيتش ريزيدنس",
    line: "Life by the water.",
    arLine: "الحياة بجانب البحر.",
    body: "From your morning coffee to the sand beneath your feet.",
    arBody: "من قهوتك الصباحية إلى الرمال تحت قدميك.",
  },
  {
    slug: "dubai-creek-harbour",
    name: "Dubai Creek Harbour",
    ar: "خور دبي",
    line: "Space to slow down.",
    arLine: "مساحة للهدوء.",
    body: "Waterfront paths and a new perspective on the skyline.",
    arBody: "مسارات على الواجهة البحرية ومنظور جديد لأفق المدينة.",
  },
];

export function HomeOpening() {
  const ar = useLocale() === "ar";
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "19%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const textY = useTransform(scrollYProgress, [0, 0.9], [0, 110]);
  return (
    <>
      <section ref={ref} className="story-opening">
        <motion.div
          className="story-opening-media"
          style={{ y: reduced ? 0 : imageY, scale: reduced ? 1 : scale }}
        >
          <Image
            src="/images/home/interior-suite.webp"
            alt={
              ar
                ? "غرفة معيشة مضيئة ونوافذ تفتح على المساحات الخضراء"
                : "Sunlight across a quiet living room, framed by floor-to-ceiling windows"
            }
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </motion.div>
        <div className="story-opening-shade" />
        <motion.div
          className="story-opening-title"
          style={{ y: reduced ? 0 : textY }}
        >
          <h1>
            {ar ? (
              <>
                دبي،
                <br />
                من الداخل.
              </>
            ) : (
              <>
                Dubai,
                <br />
                from the inside.
              </>
            )}
          </h1>
          <div className="story-opening-caption">
            <p>
              {ar
                ? "أماكن تشعرك بالانتماء. ومدينة تستحق الاكتشاف."
                : "A city to discover.\nA place to make your own."}
            </p>
            <Link
              href="/properties"
              className="story-round-link"
              aria-label={ar ? "استكشف الإقامات" : "Explore stays"}
            >
              <ArrowUpRight size={32} />
            </Link>
          </div>
        </motion.div>
        <div className="story-opening-base">
          <span>
            {ar
              ? "إقامات في دبي، برؤية مختلفة."
              : "Dubai stays, with a different point of view."}
          </span>
          <a href="#the-city">
            {ar ? "اكتشف المزيد" : "Step inside"}
            <ArrowDown size={16} />
          </a>
        </div>
      </section>
      <div className="story-search-dock">
        <Suspense
          fallback={
            <div className="story-search-loading">
              {ar ? "ابحث عن إقامتك" : "Find your place in the city"}
            </div>
          }
        >
          <UnifiedSearchBar variant="home" />
        </Suspense>
      </div>
    </>
  );
}
const CITY_MEDIA =
  "(min-width: 1100px) and (min-height: 800px) and (prefers-reduced-motion: no-preference)";
function subscribeCity(callback: () => void) {
  const media = matchMedia(CITY_MEDIA);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
export function CityJourney() {
  const ar = useLocale() === "ar";
  const ref = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLElement>(null);
  const [distance, setDistance] = useState(0);
  const enabled =
    useSyncExternalStore(
      subscribeCity,
      () => matchMedia(CITY_MEDIA).matches,
      () => false,
    ) && !ar;
  const { scrollYProgress } = useScroll({
    target: scene,
    offset: ["start start", "end end"],
  });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);
  const active = useRef(0);
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    active.current = Math.round(value * (districts.length - 1));
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setDistance(Math.max(0, el.scrollWidth - window.innerWidth)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled]);
  function moveTo(index: number) {
    const el = scene.current;
    if (!el) return;
    const n = Math.max(0, Math.min(districts.length - 1, index));
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top:
        top +
        (el.offsetHeight - window.innerHeight) * (n / (districts.length - 1)),
      behavior: "smooth",
    });
  }
  function travel(direction: number) {
    if (enabled) {
      moveTo(active.current + direction);
      return;
    }
    const el = ref.current;
    if (el)
      el.scrollBy({
        left: direction * (ar ? -1 : 1) * el.clientWidth * 0.72,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  }
  return (
    <section
      ref={scene}
      className={`story-city ${enabled ? "story-city-pinned" : ""}`}
      id="the-city"
    >
      <div className="story-city-viewport">
        <Reveal className="story-city-heading">
          <p className="story-context">
            {ar ? "اكتشف دبي" : "A city of possibilities"}
          </p>
          <h2>
            {ar ? (
              <>
                لكل حيّ
                <br />
                إيقاعه الخاص.
              </>
            ) : (
              <>
                Every corner.
                <br />A different rhythm.
              </>
            )}
          </h2>
          <div className="story-city-note">
            <p>
              {ar
                ? "ابدأ بالمكان الذي يناسبك. ثم ابحث عن إقامتك فيه."
                : "Start with a feeling.\nFind the neighborhood that fits."}
            </p>
            <div className="story-arrows">
              <button
                onClick={() => travel(-1)}
                aria-label={ar ? "الحي السابق" : "Previous neighborhood"}
              >
                <ArrowLeft />
              </button>
              <button
                onClick={() => travel(1)}
                aria-label={ar ? "الحي التالي" : "Next neighborhood"}
              >
                <ArrowRight />
              </button>
            </div>
          </div>
        </Reveal>
        <motion.div
          ref={ref}
          style={{ x: enabled ? x : 0 }}
          className="story-district-rail"
          aria-label={ar ? "أحياء دبي" : "Dubai neighborhoods"}
          tabIndex={0}
        >
          {districts.map((area, i) => (
            <Link
              href={`/properties?q=${encodeURIComponent(area.name === "Jumeirah Beach Residence" ? "JBR" : area.name)}`}
              className={`story-district story-district-${i}`}
              key={area.slug}
              onFocus={() => {
                if (enabled) moveTo(i);
              }}
            >
              <div className="story-district-media">
                <Image
                  src={`/areas/${area.slug}.webp`}
                  alt={ar ? area.ar : area.name}
                  fill
                  sizes="(max-width: 700px) 84vw, 48vw"
                  className="object-cover"
                />
                <span className="story-district-enter">
                  <ArrowUpRight size={25} />
                </span>
              </div>
              <div className="story-district-title">
                <span>{ar ? area.ar : area.name}</span>
                <span aria-hidden>{String(i + 1).padStart(2, "0")} / 05</span>
              </div>
              <h3>{ar ? area.arLine : area.line}</h3>
              <p>{ar ? area.arBody : area.body}</p>
            </Link>
          ))}
        </motion.div>
        <div className="story-city-end">
          <span>
            {ar
              ? "اختر وجهتك، وابدأ من هناك."
              : "Different neighborhoods. Your kind of Dubai."}
          </span>
          <Link href="/properties" className="story-link">
            {ar ? "كل الإقامات" : "All stays"}
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
export function HomeCare() {
  const ar = useLocale() === "ar";
  return (
    <>
      <section className="story-care">
        <div className="story-care-left">
          <Reveal>
            <p className="story-context">
              {ar ? "راحة مدروسة" : "The feeling of being looked after"}
            </p>
            <h2>
              {ar ? (
                <>
                  قبل وصولك،
                  <br />
                  نعتني بالتفاصيل.
                </>
              ) : (
                <>
                  Arrive.
                  <br />
                  Exhale.
                  <br />
                  You’re home.
                </>
              )}
            </h2>
          </Reveal>
          <SceneImage
            src="/images/home/why-b.webp"
            alt={
              ar
                ? "مساحة معيشة مفتوحة ومضيئة"
                : "An open living space, made for unhurried days"
            }
            sizes="(max-width: 700px) 90vw, 40vw"
          />
        </div>
        <div className="story-care-right">
          <SceneImage
            src="/images/owners/hero-4k/support_luxury_interior-4k.webp"
            alt={
              ar
                ? "غرفة نوم معدة لاستقبال الضيوف"
                : "Crisp linen and a room prepared for rest"
            }
            sizes="(max-width: 700px) 90vw, 45vw"
          />
          <Reveal>
            <h3>
              {ar
                ? "التفاصيل الصغيرة تصنع الفرق."
                : "A good stay is in the details."}
            </h3>
            <p>
              {ar
                ? "من ترتيب الغرف إلى فهم تفاصيل الحجز، نضع العناية والوضوح في صميم التجربة."
                : "The room you return to. The linen you sink into. The clarity of knowing what comes next. Thoughtful hosting begins long before you open the door."}
            </p>
            <Link href="/services" className="story-link">
              {ar ? "اكتشف خدماتنا" : "The care behind your stay"}
              <ArrowUpRight size={20} />
            </Link>
          </Reveal>
        </div>
      </section>
      <section className="story-owner">
        <SceneImage
          src="/images/owners/hero-4k/support_guest_experience-4k.webp"
          alt={
            ar
              ? "نخيل ومسبح عند الغروب"
              : "Palm silhouettes reflected in a pool at dusk"
          }
        />
        <div className="story-owner-copy">
          <Reveal>
            <p className="story-context">
              {ar ? "للملاك" : "A different perspective"}
            </p>
            <h2>
              {ar ? (
                <>
                  مساحتك.
                  <br />
                  قصتها القادمة.
                </>
              ) : (
                <>
                  Your space.
                  <br />
                  Its next chapter.
                </>
              )}
            </h2>
            <p>
              {ar
                ? "يرى الضيف إقامة رائعة. وترى أنت عقاراً يستحق العناية. نحن نجمع بين الاثنين."
                : "Your guests see a beautiful stay. You see a home with potential. We take care of the space between."}
            </p>
            <Link href="/owners" className="story-link">
              {ar ? "لأصحاب العقارات" : "Explore property management"}
              <ArrowUpRight size={20} />
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
