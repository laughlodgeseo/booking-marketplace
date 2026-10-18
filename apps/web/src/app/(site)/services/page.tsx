import PageDepth from "@/components/inside-story/PageDepth";
import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/i18n/server";
import { EditorialHero, NextRoute } from "@/components/inside-story/Editorial";
import { SceneImage } from "@/components/inside-story/Motion";
import StoryRail from "@/components/inside-story/StoryRail";
export const metadata: Metadata = {
  title: "The care behind your stay",
  description:
    "Explore the preparation, housekeeping and property care behind Laugh & Lodge holiday homes in Dubai.",
};
export default async function ServicesPage() {
  const ar = (await getRequestLocale()) === "ar";
  const scenes = ar
    ? [
        {
          title: "مساحة جاهزة لاستقبالك.",
          body: "التنظيف والبياضات وترتيب الأساسيات. نهتم بتفاصيل الغرفة لتكون لحظة الوصول بداية مريحة لإقامتك.",
          src: "/images/owners/hero-4k/support_luxury_interior-4k.webp",
          alt: "غرفة نوم مرتبة لاستقبال الضيوف",
          context: "إعداد الإقامة",
        },
        {
          title: "العناية تتجاوز المظهر.",
          body: "فحوصات العقار ومتابعة الصيانة وتنسيق العمل. وراء كل إقامة جيدة تفاصيل تحتاج إلى متابعة واضحة.",
          src: "/images/home/why-b.webp",
          alt: "غرفة معيشة مشرقة",
          context: "العناية بالعقار",
        },
        {
          title: "نحن هنا للمساعدة.",
          body: "أسئلة قبل الحجز أو استفسارات أثناء الإقامة؟ تواصل مع فريقنا للحصول على المساعدة ومعرفة الخطوة التالية.",
          src: "/images/home/interior-suite.webp",
          alt: "مساحة داخلية هادئة",
          context: "تواصل واضح",
        },
      ]
    : [
        {
          title: "The room, made ready.",
          body: "Fresh linen. A clean space. The essentials, considered. We coordinate the preparation that turns a property into somewhere you can settle in.",
          src: "/images/owners/hero-4k/support_luxury_interior-4k.webp",
          alt: "A carefully prepared bedroom with fresh linen",
          context: "Before the door opens",
        },
        {
          title: "Care beyond the surface.",
          body: "Inspections, maintenance coordination and property upkeep sit behind the scenes. Because a beautiful space should feel as good to live in as it looks.",
          src: "/images/home/why-b.webp",
          alt: "A bright living room open to the outdoors",
          context: "While the home is in our care",
        },
        {
          title: "A conversation away.",
          body: "Questions before you book? Need help during your stay? Reach our team for booking guidance and support with what comes next.",
          src: "/images/home/interior-suite.webp",
          alt: "Quiet seating in a sunlit living space",
          context: "When you need a hand",
        },
      ];
  return (
    <>
      <EditorialHero
        mode="services"
        title={
          ar
            ? "العناية التي تشعر بها."
            : "The things you feel. The work you don’t see."
        }
        intro={
          ar
            ? "الإقامة المريحة تبدأ قبل فتح الباب. هذه هي العناية وراء الكواليس."
            : "An effortless stay doesn’t happen by accident. It starts with everything that happens before you arrive."
        }
        context={ar ? "خدماتنا" : "Our care"}
        src="/images/home/hero-top-accent.webp"
        alt={ar ? "مساحة معيشة مفتوحة" : "An open, considered living space"}
      />
      <StoryRail
        variant="care"
        title={
          ar
            ? "قبل وصولك. طوال إقامتك."
            : "Before you arrive. While you’re here."
        }
      >
        {scenes.map((scene) => (
          <section className="v3-narrative-panel" key={scene.title}>
            <SceneImage
              src={scene.src}
              alt={scene.alt}
              sizes="(max-width:999px) 85vw, 60vw"
            />
            <div className="v3-panel-copy">
              <h2>{scene.title}</h2>
              <p>{scene.body}</p>
            </div>
          </section>
        ))}
      </StoryRail>
      <PageDepth page="services" ar={ar} />
      <NextRoute
        title={ar ? "لنتحدث عن إقامتك." : "Make yourself at home."}
        label={ar ? "تواصل معنا" : "Talk to our team"}
        href="/contact"
      />
    </>
  );
}
