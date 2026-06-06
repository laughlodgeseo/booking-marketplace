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
        <div className="site-hero-grid pointer-events-none absolute inset-0 opacity-25" />

        {/* Ambient glows */}
        <div className="pointer-events-none absolute -left-24 bottom-0 h-48 w-48 rounded-full bg-indigo-300/18 blur-3xl" />
        <div className="pointer-events-none absolute -right-12 top-6 h-36 w-36 rounded-full bg-indigo-200/14 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 pb-6 pt-5 sm:px-6 sm:pb-7 sm:pt-6 lg:px-8 lg:pb-8 lg:pt-7">
          {/* Top row: eyebrow + optional property count badge */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3 text-[#b87333]" aria-hidden="true" />
              <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#b87333]">
                {t("eyebrow")}
              </p>
            </div>
            {meta?.total ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-white/12 px-3 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {meta.total} {meta.total === 1 ? "property" : "properties"} available
              </span>
            ) : null}
          </div>

          {/* Two-column layout on large: heading left, search spanning full */}
          <div className="mt-2 lg:grid lg:grid-cols-[1fr_auto] lg:items-end lg:gap-8">
            <div>
              {/* Hero heading — Cormorant Garamond via site-shell rule */}
              <h1 className="max-w-2xl text-[1.85rem] leading-[1.1] text-white sm:text-[2.4rem] lg:text-[2.9rem]">
                {t("title")}
              </h1>
              {/* Subheading */}
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/72 sm:text-[0.9rem]">
                {t("subtitle")}
              </p>
            </div>
          </div>

          {/* Search module — clean integrated panel */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/20 bg-white/96 shadow-[0_12px_36px_rgba(15,10,60,0.22)] backdrop-blur-sm sm:mt-5">
            <div className="px-2.5 py-2.5 sm:px-3 sm:py-3">
              <UnifiedSearchBar
                variant="properties"
                defaultQ={query.q}
                defaultGuests={query.guests}
                defaultCheckIn={query.checkIn}
                defaultCheckOut={query.checkOut}
              />
            </div>
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
