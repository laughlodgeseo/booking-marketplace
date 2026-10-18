import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getRequestLocale } from "@/lib/i18n/server";
import { EditorialHero, NextRoute } from "@/components/inside-story/Editorial";
import { Reveal, SceneImage } from "@/components/inside-story/Motion";
export const metadata: Metadata = {
  title: "A new chapter for your property",
  description:
    "Holiday-home management in Dubai, with property preparation, guest care and owner visibility.",
};
export default async function OwnersPage() {
  const ar = (await getRequestLocale()) === "ar";
  return (
    <>
      <EditorialHero
        title={
          ar
            ? "من عقار تملكه، إلى مكان يحبونه."
            : "A place you own. A stay they’ll remember."
        }
        intro={
          ar
            ? "العناية بالعقار وتجربة الضيف تبدأان من رؤية واحدة. دعنا نناقش الخطوة التالية لعقارك في دبي."
            : "Good property management connects the home you care about with the guests who will care to return."
        }
        context={ar ? "لأصحاب العقارات" : "For property owners"}
        src="/images/owners/hero-4k/main_business_bay-4k.webp"
        alt={ar ? "أفق دبي عند الغروب" : "Dubai’s residential skyline at dusk"}
      />
      <div className="story-essay">
        <Reveal className="story-essay-intro">
          <h2>
            {ar ? "نعتني بالتجربة كاملة." : "One home. Every detail connected."}
          </h2>
          <div>
            <p>
              {ar
                ? "نساعد الملاك في إدارة الإقامات القصيرة، من تقديم العقار إلى تنسيق العمليات اليومية. نبدأ بفهم عقارك وأهدافك ونختار معاً نموذج الإدارة المناسب."
                : "From the way your home is presented to the way each stay is prepared, we bring the moving parts together. It starts with understanding your property, your priorities and the right management arrangement for you."}
            </p>
            <Link className="story-link" href="/contact?topic=owners">
              {ar ? "ناقش عقارك معنا" : "Let’s talk about your property"}
              <ArrowUpRight size={20} />
            </Link>
          </div>
        </Reveal>
        <section className="story-process-row">
          <SceneImage
            src="/images/home/hero-top-accent.webp"
            alt={ar ? "مساحة داخلية للعقار" : "A home, thoughtfully presented"}
          />
          <Reveal>
            <p className="story-context">
              {ar ? "العقار أولاً" : "The home comes first"}
            </p>
            <h2>
              {ar
                ? "نقدّم مساحتك بأفضل صورة."
                : "Give your space the attention it deserves."}
            </h2>
            <p>
              {ar
                ? "تقديم العقار وتجهيزه، وتنسيق النظافة والصيانة، ومتابعة استقبال الضيوف. تفاصيل عملية تصنع تجربة إقامة متماسكة."
                : "Property presentation, readiness, cleaning and maintenance coordination. Each part contributes to the guest experience; each deserves a clear plan."}
            </p>
          </Reveal>
        </section>
        <section className="story-process-row">
          <SceneImage
            src="/images/owners/hero-4k/support_guest_experience-4k.webp"
            alt={
              ar
                ? "مساحة ضيافة وقت الغروب"
                : "A poolside hospitality scene at sunset"
            }
          />
          <Reveal>
            <p className="story-context">
              {ar ? "رؤية واضحة" : "A clearer picture"}
            </p>
            <h2>
              {ar
                ? "ابقَ قريباً من عقارك."
                : "Stay close to the bigger picture."}
            </h2>
            <p>
              {ar
                ? "تابع الحجوزات والتقويم والكشوف من حساب المالك. نناقش نطاق الخدمات والرسوم والتوقعات قبل بدء العمل."
                : "Your owner account brings bookings, calendar and statements into view. We’ll discuss service scope, management fees and expectations with you before getting started."}
            </p>
            <Link href="/pricing" className="story-link">
              {ar ? "الرسوم ونموذج الإدارة" : "Understand the arrangement"}
              <ArrowUpRight size={20} />
            </Link>
          </Reveal>
        </section>
      </div>
      <NextRoute
        title={ar ? "لنكتب الفصل القادم." : "Let’s open the next chapter."}
        label={ar ? "ابدأ كمالك" : "Get started as an owner"}
        href="/signup?role=vendor"
      />
    </>
  );
}
