import { Suspense } from "react";
import { cookies } from "next/headers";
import { getRequestLocale } from "@/lib/i18n/server";
import { parseSupportedCurrency } from "@/lib/currency/currency";
import {
  HomeOpening,
  CityJourney,
  HomeCare,
} from "@/components/inside-story/HomeStory";
import RoomSequence from "@/components/inside-story/RoomSequence";
import FeaturedStays from "@/components/inside-story/FeaturedStays";
export default async function HomePage() {
  const locale = await getRequestLocale();
  const cookieStore = await cookies();
  const currency =
    parseSupportedCurrency(cookieStore.get("currency")?.value) ?? "AED";
  return (
    <>
      <HomeOpening />
      <CityJourney />
      <Suspense
        fallback={
          <section className="story-featured" aria-busy="true">
            <h2>
              {locale === "ar" ? "نبحث عن إقامتك…" : "Finding your next stay…"}
            </h2>
          </section>
        }
      >
        <FeaturedStays locale={locale} currency={currency} />
      </Suspense>
      <RoomSequence />
      <HomeCare />
    </>
  );
}
