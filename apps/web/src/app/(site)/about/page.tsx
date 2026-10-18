import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/i18n/server";
import { siteCompliance } from "@/lib/site-compliance";
import { EditorialHero, NextRoute } from "@/components/inside-story/Editorial";
import { Reveal, SceneImage } from "@/components/inside-story/Motion";
export const metadata: Metadata = {
  title: "Our story",
  description:
    "Laugh & Lodge Vacation Homes Rental LLC — Dubai holiday homes, thoughtful hosting and property care.",
};
export default async function AboutPage() {
  const ar = (await getRequestLocale()) === "ar";
  return (
    <>
      <EditorialHero
        mode="about"
        title={
          ar
            ? "مدينة كبيرة. إحساس بالانتماء."
            : "A big city. A more personal way to stay."
        }
        intro={
          ar
            ? "نؤمن أن المكان الذي تعود إليه هو جزء من تجربة المدينة."
            : "Dubai is a city of extraordinary scale. We’re interested in the part that feels like yours."
        }
        context={ar ? "قصتنا" : "Our story"}
        src="/areas/downtown-dubai.webp"
        alt={
          ar
            ? "أفق دبي في ضوء المساء"
            : "The Dubai skyline in the evening light"
        }
      />
      <div className="story-essay v2-about-essay">
        <Reveal className="story-essay-intro">
          <h2>
            {ar
              ? "المدينة، من الداخل."
              : "The inside makes all the difference."}
          </h2>
          <p>
            {ar
              ? "لاف آند لودج هي شركة لإيجارات بيوت العطلات في دبي. نجمع بين تجربة الضيف والعناية بالعقار، ليجد الضيوف مكاناً يناسب إقامتهم ويجد الملاك شريكاً يهتم بالتفاصيل."
              : "Laugh & Lodge Vacation Homes Rental LLC brings together two sides of the same home: a guest looking for a place to belong, and an owner looking for thoughtful care. We connect the experience of staying with the work of hosting."}
          </p>
        </Reveal>
        <section className="story-process-row">
          <SceneImage
            src="/images/home/interior-suite.webp"
            alt={
              ar
                ? "غرفة معيشة دافئة ومضيئة"
                : "A quiet room filled with natural light"
            }
          />
          <Reveal>
            <h2>{ar ? "مساحة لروتينك الخاص." : "Room for your own rhythm."}</h2>
            <p>
              {ar
                ? "قهوة الصباح ووقت الراحة ونهاية يوم طويل في المدينة. نركز على الأماكن والتفاصيل التي تمنح الإقامة معناها."
                : "The first coffee. An unhurried morning. A familiar room at the end of an unfamiliar day. A stay becomes memorable through small, ordinary moments. Our work is to make room for them."}
            </p>
          </Reveal>
        </section>
        <section className="story-company-details">
          <h2>{ar ? "تفاصيل الشركة" : "Here in Dubai"}</h2>
          <p>Laugh & Lodge Vacation Homes Rental LLC</p>
          <p>{siteCompliance.registeredOffice}</p>
          <p>
            DTCM Holiday Homes Permit: {siteCompliance.dtcmPermit}
            <br />
            Business Registration No:{" "}
            {siteCompliance.businessRegistrationNumber}
          </p>
        </section>
      </div>
      <NextRoute
        title={ar ? "تعرف على مساحتك القادمة." : "Find your side of the city."}
        label={ar ? "استكشف الإقامات" : "Explore the stays"}
        href="/properties"
      />
    </>
  );
}
