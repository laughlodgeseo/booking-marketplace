import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { fetchFeaturedStays } from "@/lib/api/publicSearch";
import { Reveal } from "./Motion";
export default async function FeaturedStays({
  locale,
  currency,
}: {
  locale: "en" | "ar";
  currency: string;
}) {
  const ar = locale === "ar";
  const result = await fetchFeaturedStays(
    { pageSize: 5 },
    { locale, currency },
  );
  return (
    <section className="story-featured">
      <Reveal className="story-featured-heading">
        <h2>
          {ar ? (
            <>
              مكان تتطلع
              <br />
              للعودة إليه.
            </>
          ) : (
            <>
              Somewhere you’ll
              <br />
              want to come back to.
            </>
          )}
        </h2>
        <Link href="/properties" className="story-link">
          {ar ? "استكشف الإقامات" : "Explore stays"}
          <ArrowUpRight size={20} />
        </Link>
      </Reveal>
      {result.ok && result.items.length > 0 ? (
        <div className="story-stay-rail">
          {result.items.map((stay) => (
            <Link
              href={`/properties/${stay.slug}`}
              key={stay.id}
              data-stay-key={stay.coverImageUrl || undefined}
              className="story-stay"
            >
              <div className="story-stay-cover">
                {stay.coverImageUrl && (
                  <Image
                    src={stay.coverImageUrl}
                    alt={stay.title}
                    fill
                    sizes="(max-width:700px) 86vw, 58vw"
                    className="object-cover"
                  />
                )}
                <ArrowUpRight />
              </div>
              <p>{stay.area || stay.city}</p>
              <h3>{stay.title}</h3>
              <div className="story-stay-facts">
                <span>
                  {stay.bedrooms != null
                    ? `${stay.bedrooms} ${ar ? "غرف نوم" : "bedrooms"}`
                    : ""}
                  {stay.guests != null
                    ? ` · ${stay.guests} ${ar ? "ضيوف" : "guests"}`
                    : ""}
                </span>
                {stay.priceFrom != null && (
                  <span>
                    {new Intl.NumberFormat(locale, {
                      style: "currency",
                      currency: stay.currency || currency,
                      maximumFractionDigits: 0,
                    }).format(stay.priceFrom)}{" "}
                    / {ar ? "ليلة" : "night"}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="story-inventory-interlude">
          <div className="story-inventory-image">
            <Image
              src="/images/home/hero-top-accent.webp"
              alt={
                ar
                  ? "إلهام لمساحة معيشة"
                  : "Interior inspiration: an airy, open-plan living room"
              }
              fill
              sizes="(max-width:700px) 100vw, 65vw"
              className="object-cover"
            />
            <span>
              {ar
                ? "إلهام للمساحات · ليست قائمة حجز"
                : "Spaces to inspire · Editorial photography"}
            </span>
          </div>
          <div className="story-inventory-message">
            <p className="story-context">
              {ar ? "لنجد إقامتك" : "Let’s find your place"}
            </p>
            <h3>
              {ar
                ? "إقامتك القادمة تستحق البحث."
                : "Good things are worth finding."}
            </h3>
            <p>
              {result.ok
                ? ar
                  ? "لا توجد إقامات مميزة حالياً. استكشف البحث أو تواصل معنا لمساعدتك."
                  : "There are no featured stays to show at the moment. Explore the search or tell us what you have in mind."
                : ar
                  ? "تعذّر تحميل الإقامات المتاحة حالياً. تواصل معنا للمساعدة في التخطيط لإقامتك."
                  : "Available stays aren’t loading right now. Tell us your dates and we’ll help you plan your next stay."}
            </p>
            <Link href="/contact" className="story-link">
              {ar ? "تحدث معنا" : "Talk to us"}
              <ArrowUpRight size={18} />
            </Link>
            <Link href="/properties" className="story-link">
              {ar ? "حاول البحث مجدداً" : "Try searching again"}
              <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
