import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, CheckCircle2, Sparkles } from "lucide-react";
import GalleryDetailCollage from "@/components/tourm/gallery/GalleryDetailCollage";
import { GALLERY_CATEGORY_LABEL, GALLERY_ITEMS } from "@/lib/content/gallery-items";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return GALLERY_ITEMS.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const item = GALLERY_ITEMS.find((entry) => entry.slug === slug);
  if (!item) return {};

  return {
    title: `${item.title} | Gallery`,
    description: `${item.title} in ${item.area}. ${item.description}`,
    alternates: {
      canonical: `/gallery/${item.slug}`,
    },
    openGraph: {
      title: `${item.title} | Laugh & Lodge`,
      description: `${item.description} • ${item.area}`,
      images: [{ url: item.cover.src }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${item.title} | Laugh & Lodge`,
      description: `${item.description} • ${item.area}`,
      images: [item.cover.src],
    },
  };
}

export default async function GalleryDetailPage(props: PageProps) {
  const { slug } = await props.params;
  const item = GALLERY_ITEMS.find((entry) => entry.slug === slug);
  if (!item) notFound();

  const related = GALLERY_ITEMS.filter((entry) => entry.slug !== item.slug)
    .sort((a, b) => Number(b.category === item.category) - Number(a.category === item.category))
    .slice(0, 3);

  return (
    <main className="min-h-screen bg-transparent">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#4F46E5] via-[#4338CA] to-[#3730A3] text-white shadow-[inset_0_-20px_42px_rgba(11,15,25,0.18)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 top-[-7rem] h-[22rem] w-[22rem] rounded-full bg-indigo-300/35 blur-3xl" />
          <div className="absolute -right-20 bottom-[-7rem] h-[20rem] w-[20rem] rounded-full bg-sky-200/20 blur-3xl" />
          <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(248,250,252,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,0.12)_1px,transparent_1px)] [background-size:34px_34px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-11 pt-12 sm:px-6 sm:pt-14 lg:px-8">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/13 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/90 ring-1 ring-white/35">
            <Link href="/gallery" className="transition hover:text-white">
              Gallery
            </Link>
            <span className="text-white/60">/</span>
            <span>{GALLERY_CATEGORY_LABEL[item.category]}</span>
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{item.title}</h1>
          <p className="mt-2 text-sm text-white/86 sm:text-base">{item.area}</p>
        </div>
      </section>

      <section className="bg-transparent py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <GalleryDetailCollage title={item.title} images={item.gallery} />

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: "Premium finishes",
                copy: "Composed materials and lighting designed for repeatable guest comfort.",
              },
              {
                icon: CheckCircle2,
                title: "Verified availability",
                copy: "Visuals map to real inventory with date-aware booking confidence.",
              },
              {
                icon: Building2,
                title: "Operator-ready stays",
                copy: "Layouts selected for easy turnovers and consistent hosting standards.",
              },
            ].map((highlight) => (
              <div
                key={highlight.title}
                className="rounded-[1.5rem] bg-surface/88 p-5 text-primary ring-1 ring-black/5 shadow-[0_14px_36px_rgba(11,15,25,0.1)]"
              >
                <highlight.icon className="h-5 w-5 text-brand" />
                <p className="mt-3 text-sm font-semibold">{highlight.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-secondary/78">{highlight.copy}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[1.7rem] bg-surface/84 p-6 ring-1 ring-black/5 shadow-[0_16px_40px_rgba(11,15,25,0.12)]">
            <p className="text-sm leading-relaxed text-secondary/84">{item.description}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/properties?q=${encodeURIComponent(item.area)}`}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand px-5 text-sm font-semibold text-inverted shadow-[0_14px_32px_rgba(79,70,229,0.3)] transition hover:bg-brand-hover"
              >
                Search this area
              </Link>
              <Link
                href="/gallery"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-surface/92 px-5 text-sm font-semibold text-primary ring-1 ring-black/5 shadow-[0_12px_30px_rgba(11,15,25,0.1)] transition hover:bg-white"
              >
                Explore full gallery
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-11 max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold text-primary">More from the gallery</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((entry) => (
              <Link
                key={entry.slug}
                href={`/gallery/${entry.slug}`}
                className="group overflow-hidden rounded-[1.65rem] bg-surface shadow-[0_14px_36px_rgba(11,15,25,0.11)] ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(11,15,25,0.14)]"
              >
                <div className="relative aspect-[4/3]">
                  <Image
                    src={entry.cover.src}
                    alt={entry.cover.alt}
                    fill
                    sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 30vw"
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03] group-hover:brightness-105"
                  />
                </div>
                <div className="p-4">
                  <p className="text-sm font-semibold text-primary">{entry.title}</p>
                  <p className="mt-1 text-xs text-secondary">{entry.area}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
