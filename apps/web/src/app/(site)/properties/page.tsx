import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createTranslator } from "next-intl";
import { MapPin } from "lucide-react";
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
  description: "Find serviced apartments and vacation homes with premium hospitality support.",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PropertiesPage(props: PageProps) {
  const locale = await getRequestLocale();
  const messages = getLocaleMessages(locale);
  const t = createTranslator({
    locale,
    messages,
    namespace: "propertiesPage",
  });
  const cookieStore = await cookies();
  const currency = parseSupportedCurrency(cookieStore.get("currency")?.value);
  const searchParams = await props.searchParams;
  const query = parsePropertiesQuery(searchParams);

  const res = await searchProperties({
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
  }, { locale, currency });

  const items = res.ok ? res.data.items : [];
  const meta = res.ok ? res.data.meta : null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rentpropertyuae.com";
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

      {/* ── Premium indigo hero ─────────────────────────────────────── */}
      <section className="site-hero-shell relative overflow-x-hidden pt-[72px] sm:pt-[80px]">
        {/* Subtle geometry grid */}
        <div className="site-hero-grid pointer-events-none absolute inset-0 opacity-30" />

        {/* Soft radial glows */}
        <div className="pointer-events-none absolute -left-32 bottom-0 h-64 w-64 rounded-full bg-indigo-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 top-8 h-48 w-48 rounded-full bg-indigo-200/16 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 sm:pt-10 lg:px-8">
          {/* Eyebrow */}
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-[#b87333]" aria-hidden="true" />
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#b87333]">
              {t("eyebrow")}
            </p>
          </div>

          {/* Hero heading */}
          <h1 className="mt-2 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.6rem]">
            {t("title")}
          </h1>

          {/* Subheading */}
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/74 sm:text-base">
            {t("subtitle")}
          </p>

          {/* Search card — elevated white panel */}
          <div className="mt-6 rounded-2xl border border-white/18 bg-white/96 p-3 shadow-[0_20px_56px_rgba(15,10,60,0.28)] backdrop-blur-sm sm:p-4">
            <UnifiedSearchBar
              variant="properties"
              defaultQ={query.q}
              defaultGuests={query.guests}
              defaultCheckIn={query.checkIn}
              defaultCheckOut={query.checkOut}
            />
          </div>
        </div>
      </section>
      {/* ── End hero ───────────────────────────────────────────────── */}

      <section className="bg-transparent py-8 lg:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {!res.ok ? (
            <NetworkErrorState
              title={t("listErrorTitle")}
              message={res.message || t("listErrorMessage")}
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
