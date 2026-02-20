import type { Metadata } from "next";
import Link from "next/link";
import BlogHero from "@/components/tourm/blog/BlogHero";
import BlogGrid from "@/components/tourm/blog/BlogGrid";
import { getRequestLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Blog | Laugh & Lodge",
  description: "Travel tips, area guides, and hosting insights for Dubai & UAE stays.",
};

const COPY = {
  en: {
    eyebrow: "More",
    title: "Ready to browse available stays?",
    cta: "Explore stays",
  },
  ar: {
    eyebrow: "المزيد",
    title: "جاهز لتصفح الإقامات المتاحة؟",
    cta: "استكشف الإقامات",
  },
} as const;

export default async function BlogPage() {
  const locale = await getRequestLocale();
  const copy = COPY[locale];

  return (
    <main className="min-h-screen bg-transparent">
      <BlogHero />
      <div className="bg-transparent">
        <BlogGrid />
      </div>
      <section className="py-8 sm:py-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:items-center sm:px-6 sm:text-left lg:px-8">
          <div className="max-w-[38ch]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary/70">{copy.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary">{copy.title}</h2>
          </div>
          <Link
            href="/properties"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand px-5 text-sm font-semibold text-accent-text shadow-brand-soft transition hover:bg-brand-hover"
          >
            {copy.cta}
          </Link>
        </div>
      </section>
      <div className="h-10 sm:h-16" />
    </main>
  );
}
