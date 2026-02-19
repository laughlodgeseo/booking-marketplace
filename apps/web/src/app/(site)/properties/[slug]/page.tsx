import type { Metadata } from "next";
import Link from "next/link";
import { CircleHelp, ExternalLink, FileText, MapPin, MessageSquare, Star } from "lucide-react";

import { getPropertyBySlug } from "@/lib/api/properties";
import PropertyGalleryHero from "@/components/property/PropertyGalleryHero";
import type { PropertyGalleryImage } from "@/components/property/property-gallery.types";
import PropertyFacts from "@/components/property/PropertyFacts";
import GoogleMap from "@/components/maps/GoogleMap";

import AmenitiesSection from "@/components/tourm/property/AmenitiesSection";
import HouseRulesSection, { type HouseRuleItem } from "@/components/tourm/property/HouseRulesSection";
import ThingsToKnowSection, { type ThingsToKnowBlock } from "@/components/tourm/property/ThingsToKnowSection";

import QuotePanelBatchA from "@/components/booking/QuotePanelBatchA";
import PublicPropertyCalendar from "@/components/property/PublicPropertyCalendar";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type AmenityLike = string | { key: string; label?: string };
type GuestReviewView = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  createdAt: string;
  reviewer: string;
};

function normalizeAmenities(input: unknown): { key: string; label?: string }[] {
  if (!input) return [];

  if (Array.isArray(input)) {
    const items: { key: string; label?: string }[] = [];
    for (const raw of input as AmenityLike[]) {
      if (typeof raw === "string") {
        const k = raw.trim();
        if (!k) continue;
        items.push({ key: k });
        continue;
      }

      if (typeof raw === "object" && raw !== null) {
        const maybeKey = "key" in raw ? String((raw as { key: unknown }).key) : "";
        const maybeLabel = "label" in raw ? String((raw as { label?: unknown }).label ?? "") : "";

        const k = maybeKey.trim();
        const l = maybeLabel.trim();

        if (!k && !l) continue;
        items.push({ key: k || l, label: l || undefined });
      }
    }
    return items;
  }

  if (typeof input === "string") {
    return input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((k) => ({ key: k }));
  }

  return [];
}

function normalizeGuestReviews(input: unknown): GuestReviewView[] {
  if (!Array.isArray(input)) return [];
  const out: GuestReviewView[] = [];

  for (const row of input) {
    if (typeof row !== "object" || row === null) continue;
    const obj = row as {
      id?: unknown;
      rating?: unknown;
      title?: unknown;
      comment?: unknown;
      createdAt?: unknown;
      customer?: { fullName?: unknown } | null;
    };

    const id = typeof obj.id === "string" ? obj.id : "";
    const rating = typeof obj.rating === "number" ? obj.rating : Number.NaN;
    const createdAt = typeof obj.createdAt === "string" ? obj.createdAt : "";

    if (!id || !Number.isFinite(rating) || !createdAt) continue;

    out.push({
      id,
      rating,
      title: typeof obj.title === "string" ? obj.title : null,
      comment: typeof obj.comment === "string" ? obj.comment : null,
      createdAt,
      reviewer:
        obj.customer && typeof obj.customer.fullName === "string" && obj.customer.fullName.trim()
          ? obj.customer.fullName.trim()
          : "Guest",
    });
  }

  return out;
}

function googleMapsLink(lat: number, lng: number, label?: string | null) {
  const q = label && label.trim().length > 0 ? encodeURIComponent(label.trim()) : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function stableGalleryImageId(
  id: string | null | undefined,
  url: string,
  sortOrder: number,
  index: number,
) {
  const value = (id ?? "").trim();
  if (value) return value;
  return `${url}#${sortOrder}-${index}`;
}

function reviewerInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "G";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const res = await getPropertyBySlug(slug);
  if (res.ok) {
    const p = res.data;
    const description =
      p.subtitle ??
      p.description ??
      `Operator-managed stay in ${p.area ?? p.city ?? "Dubai"} with verified availability.`;
    const coverImageUrl = (p as unknown as { coverImage?: { url?: string | null } }).coverImage?.url;
    const image =
      coverImageUrl ??
      p.media.find((m) => m.url && m.url.trim().length > 0)?.url ??
      "/brand/logo.svg";

    return {
      title: `${p.title} | Laugh & Lodge`,
      description,
      alternates: {
        canonical: `/properties/${p.slug}`,
      },
      openGraph: {
        title: `${p.title} | Laugh & Lodge`,
        description,
        url: `/properties/${p.slug}`,
        images: [{ url: image }],
      },
      twitter: {
        card: "summary_large_image",
        title: `${p.title} | Laugh & Lodge`,
        description,
        images: [image],
      },
    };
  }
  return {
    title: `${decodeURIComponent(slug)} | Laugh & Lodge`,
  };
}

export default async function PropertyDetailPage(props: PageProps) {
  const { slug } = await props.params;

  const res = await getPropertyBySlug(slug);
  if (!res.ok) {
    return (
      <main className="min-h-screen bg-transparent">
        <div className="mx-auto max-w-4xl px-4 pb-16 pt-12 sm:px-6 sm:pt-14 lg:px-8">
          <div className="premium-card premium-card-tinted rounded-2xl border border-white/70 p-6 text-sm text-secondary shadow-[0_18px_44px_rgba(11,15,25,0.1)]">
            Could not load property:{" "}
            <span className="font-semibold text-primary">{res.message}</span>
          </div>
        </div>
      </main>
    );
  }

  const p = res.data;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rentpropertyuae.com";

  const apiAmenities = normalizeAmenities((p as unknown as { amenities?: unknown }).amenities);
  const fallbackAmenities: { key: string }[] = [
    "WIFI",
    "AIR_CONDITIONING",
    "KITCHEN",
    "TV",
    "HOUSEKEEPING",
    "SECURITY",
    "NO_SMOKING",
    "ELEVATOR",
    "PARKING_FREE",
    "HOT_WATER",
    "WASHER",
    "WORKSPACE",
  ].map((k) => ({ key: k }));

  const amenities = apiAmenities.length > 0 ? apiAmenities : fallbackAmenities;
  const guestReviews = normalizeGuestReviews(
    (p as unknown as { guestReviews?: unknown }).guestReviews,
  );

  const apiHouseRules = (p as unknown as { houseRules?: unknown }).houseRules;
  const rulesFromApi: HouseRuleItem[] = Array.isArray(apiHouseRules)
    ? apiHouseRules
        .map((r) => {
          if (typeof r === "string") return { key: r };
          if (typeof r === "object" && r !== null) {
            const key = "key" in r ? String((r as { key: unknown }).key ?? "") : "";
            const label = "label" in r ? String((r as { label?: unknown }).label ?? "") : "";
            const detail = "detail" in r ? String((r as { detail?: unknown }).detail ?? "") : "";
            const k = key.trim() || label.trim();
            if (!k) return null;
            return { key: k, label: label.trim() || undefined, detail: detail.trim() || undefined };
          }
          return null;
        })
        .filter((x): x is HouseRuleItem => x !== null)
    : [];

  const fallbackRules: HouseRuleItem[] = [
    { key: "NO_SMOKING" },
    { key: "NO_PARTIES" },
    { key: "QUIET_HOURS", detail: "Please respect quiet hours in the building/community." },
    { key: "ID_REQUIRED", detail: "Government ID may be required for check-in verification." },
  ];

  const houseRules = rulesFromApi.length ? rulesFromApi : fallbackRules;

  const blocks: ThingsToKnowBlock[] = [
    {
      title: "Check-in & check-out",
      icon: "CHECKIN",
      lines: [
        "Check-in details are shared once your reservation is confirmed.",
        "Please keep a valid government ID ready if building verification is required.",
        "Late check-out can be requested, subject to availability.",
      ],
    },
    {
      title: "Cancellation",
      icon: "POLICIES",
      lines: [
        "Final cancellation terms are shown before payment in checkout.",
        "Any applicable fees are included in the quote breakdown before you reserve.",
      ],
    },
    {
      title: "Safety & property",
      icon: "SECURITY",
      lines: [
        "Availability is validated in real time before holds and bookings are created.",
        "Operator support is available for stay-related access and issue resolution.",
        "Cleaning and turnover standards follow operator-managed workflows.",
      ],
    },
  ];

  const hasCoords = p.lat !== null && p.lng !== null;
  const mapsHref = hasCoords ? googleMapsLink(p.lat as number, p.lng as number, p.title) : null;
  const metaLocation = [p.area ?? null, p.city ?? null].filter(Boolean).join(" • ");
  const galleryImages: PropertyGalleryImage[] = p.media
    .reduce<PropertyGalleryImage[]>((acc, media, index) => {
      const url = (media.url ?? "").trim();
      if (!url) return acc;

      const sortOrder = Number.isFinite(media.sortOrder) ? media.sortOrder : index;
      const alt = (media.alt ?? p.title).trim() || p.title;

      acc.push({
        id: stableGalleryImageId(media.id, url, sortOrder, index),
        url,
        alt,
        sortOrder,
      });

      return acc;
    }, [])
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const reviewCount = guestReviews.length;
  const averageRating =
    reviewCount > 0
      ? guestReviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
      : null;
  const aboutText =
    p.description ??
    "Operator-managed vacation home with hotel-grade cleaning, verified availability, and responsive guest support.";
  const aboutPreview =
    aboutText.length > 320 ? `${aboutText.slice(0, 320).trimEnd()}...` : aboutText;
  const hasLongAbout = aboutText.length > 320;
  const areaHighlights = [
    metaLocation ? `Located in ${metaLocation}.` : "Located in a connected urban neighborhood.",
    hasCoords
      ? "Map pin shows neighborhood-level context before booking confirmation."
      : "Exact map pin is shared once location details are published for this stay.",
    "Nearby access to dining, essentials, and transport varies by time and season.",
  ];
  const detailJsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: p.title,
    description:
      p.subtitle ?? p.description ?? "Operator-managed vacation stay with verified availability.",
    image: [
      (p as unknown as { coverImage?: { url?: string | null } }).coverImage?.url,
      ...p.media.map((m) => m.url).filter((url) => Boolean(url && url.trim())),
    ].filter(Boolean),
    url: `${siteUrl}/properties/${p.slug}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: p.city ?? "Dubai",
      addressRegion: p.area ?? undefined,
      addressCountry: "AE",
    },
    geo:
      p.lat !== null && p.lng !== null
        ? {
            "@type": "GeoCoordinates",
            latitude: p.lat,
            longitude: p.lng,
          }
        : undefined,
    amenityFeature: amenities.map((amenity) => ({
      "@type": "LocationFeatureSpecification",
      name:
        (amenity as unknown as { label?: string | null }).label?.trim() ||
        amenity.key,
      value: true,
    })),
    offers: {
      "@type": "Offer",
      priceCurrency: p.currency,
      price: p.priceFrom,
      url: `${siteUrl}/properties/${p.slug}`,
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <main className="min-h-screen bg-[rgb(var(--color-bg-rgb)/0.7)]">
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(detailJsonLd)}
      </script>
      <section className="relative overflow-hidden border-b border-white/24 bg-gradient-to-br from-[#4F46E5] to-[#4338CA] text-white">
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(248,250,252,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,0.12)_1px,transparent_1px)] [background-size:34px_34px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6 sm:pt-14 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/74">Stay</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {p.title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/84 sm:text-base">
              {p.subtitle ?? "Premium serviced stay with operator support and verified availability."}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-3">
              {averageRating !== null ? (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                  <Star className="h-3.5 w-3.5 fill-current text-amber-300" />
                  <span>
                    {averageRating.toFixed(1)} · {reviewCount} verified reviews
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                  New listing
                </div>
              )}

              {metaLocation ? (
                <div className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                  {metaLocation}
                </div>
              ) : null}

              <div className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                Verified availability
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-transparent pb-2 pt-6 sm:pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <PropertyGalleryHero images={galleryImages} propertyName={p.title} />
        </div>
      </section>

      <section className="bg-transparent pb-24 pt-6 sm:pt-8 lg:pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-10">
            <div className="space-y-6 sm:space-y-8 lg:col-span-7 xl:col-span-8">
              <PropertyFacts property={p} />

              <AmenitiesSection title="Amenities" items={amenities} previewCount={12} />

              <HouseRulesSection items={houseRules} />

              <ThingsToKnowSection blocks={blocks} />

              <PublicPropertyCalendar slug={p.slug} />

              <section className="premium-card premium-card-tinted rounded-2xl border border-white/70 p-5 shadow-[0_18px_44px_rgba(11,15,25,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_54px_rgba(11,15,25,0.14)] sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/82 shadow-[0_6px_14px_rgba(11,15,25,0.08)] ring-1 ring-white/75">
                    <FileText className="h-[19px] w-[19px] stroke-[1.9] text-indigo-600/90" />
                  </div>
                  <div className="text-lg font-semibold tracking-tight text-primary">About this stay</div>
                </div>

                <div className="prose prose-sm mt-3 max-w-none text-secondary">
                  <p>{aboutPreview}</p>
                </div>

                {hasLongAbout ? (
                  <details className="mt-2 rounded-xl bg-[rgb(var(--color-bg-rgb)/0.78)] p-3 ring-1 ring-white/72">
                    <summary className="cursor-pointer text-sm font-semibold text-primary">Read more</summary>
                    <div className="prose prose-sm mt-3 max-w-none text-secondary">
                      <p>{aboutText}</p>
                    </div>
                  </details>
                ) : null}
              </section>

              <section className="premium-card premium-card-tinted rounded-2xl border border-white/70 p-5 shadow-[0_18px_44px_rgba(11,15,25,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_54px_rgba(11,15,25,0.14)] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/82 shadow-[0_6px_14px_rgba(11,15,25,0.08)] ring-1 ring-white/75">
                      <MessageSquare className="h-[19px] w-[19px] stroke-[1.9] text-indigo-600/90" />
                    </div>
                    <div className="text-lg font-semibold tracking-tight text-primary">Guest reviews</div>
                  </div>

                  {reviewCount > 0 ? (
                    <div className="rounded-full bg-[rgb(var(--color-bg-rgb)/0.78)] px-3 py-1 text-xs font-semibold text-secondary ring-1 ring-white/72">
                      {averageRating?.toFixed(1)} · {reviewCount} reviews
                    </div>
                  ) : null}
                </div>

                {guestReviews.length === 0 ? (
                  <p className="mt-3 text-sm text-secondary/70">
                    No approved reviews yet. Reviews appear after completed stays and moderation.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {guestReviews.slice(0, 8).map((review) => (
                      <article key={review.id} className="rounded-2xl bg-[rgb(var(--color-bg-rgb)/0.78)] p-4 shadow-[0_8px_18px_rgba(11,15,25,0.08)] ring-1 ring-white/72">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-full bg-white/82 text-xs font-bold text-primary ring-1 ring-white/72">
                              {reviewerInitials(review.reviewer)}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-primary">{review.reviewer}</div>
                              <div className="text-xs text-secondary/70">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-white/72">
                            {review.rating.toFixed(1)} / 5
                          </div>
                        </div>
                        {review.title ? (
                          <div className="mt-3 text-sm font-semibold text-primary">{review.title}</div>
                        ) : null}
                        {review.comment ? (
                          <p className="mt-1 text-sm leading-relaxed text-secondary/80">{review.comment}</p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="premium-card premium-card-tinted rounded-2xl border border-white/70 p-5 shadow-[0_18px_44px_rgba(11,15,25,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_54px_rgba(11,15,25,0.14)] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/82 shadow-[0_6px_14px_rgba(11,15,25,0.08)] ring-1 ring-white/75">
                      <MapPin className="h-[19px] w-[19px] stroke-[1.9] text-indigo-600/90" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold tracking-tight text-primary">Location</div>
                      <div className="text-xs text-secondary/70">
                        {metaLocation || "Area context will expand over time (nearby points, walkability)."}
                      </div>
                    </div>
                  </div>

                  {mapsHref ? (
                    <Link
                      href={mapsHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-[rgb(var(--color-bg-rgb)/0.86)] px-3 py-2 text-xs font-extrabold text-indigo-700 ring-1 ring-white/72 transition hover:bg-[rgb(var(--color-bg-rgb)/0.94)]"
                    >
                      Open in Maps <ExternalLink className="h-4 w-4" />
                    </Link>
                  ) : null}
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl shadow-sm ring-1 ring-white/72">
                  {hasCoords ? (
                    <GoogleMap
                      className="h-[320px] w-full overflow-hidden rounded-2xl sm:h-[420px]"
                      center={{ lat: p.lat as number, lng: p.lng as number }}
                      zoom={13}
                      points={[
                        {
                          propertyId: p.id,
                          lat: p.lat as number,
                          lng: p.lng as number,
                          priceFrom: p.priceFrom,
                          currency: p.currency,
                          slug: p.slug,
                          title: p.title,
                        },
                      ]}
                    />
                  ) : (
                    <div className="grid h-[240px] place-items-center bg-[rgb(var(--color-bg-rgb)/0.78)] text-sm text-secondary/75">
                      Map location not set for this property.
                    </div>
                  )}
                </div>

                <div className="mt-3 rounded-2xl bg-[rgb(var(--color-bg-rgb)/0.78)] p-3 ring-1 ring-white/72">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    <CircleHelp className="h-3.5 w-3.5 text-indigo-600/90" /> Area highlights
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-secondary">
                    {areaHighlights.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>

            <aside className="lg:sticky lg:top-24 lg:col-span-5 lg:self-start xl:col-span-4">
              <QuotePanelBatchA
                propertyId={p.id}
                slug={p.slug}
                currency={p.currency}
                priceFrom={p.priceFrom}
              />
            </aside>
          </div>
        </div>
      </section>

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-32 h-72 w-72 rounded-full bg-brand/8 blur-3xl" />
        <div className="absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-dark-1/8 blur-3xl" />
      </div>
    </main>
  );
}
