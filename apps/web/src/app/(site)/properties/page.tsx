import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createTranslator } from "next-intl";
import { PageHeading } from "@/components/inside-story/Editorial";
import UnifiedSearchBar from "@/components/search/UnifiedSearchBar";
import PropertiesSearchShell from "@/components/search/properties/PropertiesSearchShell";
import NetworkErrorState from "@/components/ui/NetworkErrorState";
import { searchProperties } from "@/lib/api/search";
import { parsePropertiesQuery } from "@/lib/search/params";
import { parseSupportedCurrency } from "@/lib/currency/currency";
import { getLocaleMessages } from "@/lib/i18n/messages";
import { getRequestLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Stays | Laugh & Lodge",
  description:
    "Find serviced apartments and vacation homes with premium hospitality support.",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PropertiesPage(props: PageProps) {
  const locale = await getRequestLocale();
  const messages = getLocaleMessages(locale);
  const t = createTranslator({ locale, messages, namespace: "propertiesPage" });
  const cookieStore = await cookies();
  const currency = parseSupportedCurrency(cookieStore.get("currency")?.value);
  const searchParams = await props.searchParams;
  const query = parsePropertiesQuery(searchParams);

  const res = await searchProperties(
    {
      q: query.q,
      city: query.city,
      area: query.area,
      guests: query.guests,
      bedrooms: query.bedrooms,
      bathrooms: query.bathrooms,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      amenities: query.amenities,
      checkIn: query.checkIn,
      checkOut: query.checkOut,
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort ?? "relevance",
    },
    { locale, currency },
  );

  const items = res.ok ? res.data.items : [];
  const meta = res.ok ? res.data.meta : null;

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://rentpropertyuae.com";
  const listJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Laugh & Lodge properties",
    itemListElement: items.slice(0, 20).map((it, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${siteUrl}/properties/${it.slug}`,
      name: it.title,
    })),
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-transparent">
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(listJsonLd)}
      </script>

      <PageHeading
        context={locale === "ar" ? "إقامات دبي" : "Find your place"}
        title={locale === "ar" ? "دبي، على طريقتك." : "Your kind of Dubai."}
        intro={
          locale === "ar"
            ? "اختر المنطقة والتواريخ، وابحث عن مكان تشعر فيه بالانتماء."
            : "A waterfront morning. A city-center evening. Find a home for the way you want to stay."
        }
      />
      <section className="story-discovery-search">
        <UnifiedSearchBar
          variant="properties"
          defaultQ={query.q}
          defaultGuests={query.guests}
          defaultCheckIn={query.checkIn}
          defaultCheckOut={query.checkOut}
        />
      </section>

      <section className="bg-transparent py-5 lg:py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {!res.ok ? (
            <NetworkErrorState
              title={t("listErrorTitle")}
              message={t("listErrorMessage")}
              retryLabel={t("listErrorRetry")}
            />
          ) : (
            <PropertiesSearchShell
              query={query}
              items={items}
              meta={meta}
              showFiltersPanel={false}
            />
          )}
        </div>
      </section>

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 bottom-10 h-72 w-72 rounded-full bg-brand/8 blur-3xl" />
        <div className="absolute -right-24 top-32 h-72 w-72 rounded-full bg-dark-1/8 blur-3xl" />
      </div>
    </main>
  );
}
