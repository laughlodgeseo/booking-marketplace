import type { Metadata } from "next";
import { Suspense } from "react";
import GalleryHero from "@/components/tourm/gallery/GalleryHero";
import GalleryGrid from "@/components/tourm/gallery/GalleryGrid";
import GalleryCta from "@/components/tourm/gallery/GalleryCta";

export const metadata: Metadata = {
  title: "Gallery | Laugh & Lodge",
  description: "A visual preview of our serviced apartments and vacation homes in Dubai & UAE.",
};

export default function GalleryPage() {
  return (
    <main className="min-h-screen bg-transparent">
      <GalleryHero />
      <div className="bg-transparent">
        <Suspense
          fallback={(
            <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
              <div className="h-[420px] w-full animate-pulse rounded-3xl bg-[rgb(var(--color-bg-rgb)/0.82)]" />
            </section>
          )}
        >
          <GalleryGrid />
        </Suspense>
      </div>
      <div className="bg-transparent">
        <GalleryCta />
      </div>
      <div className="h-10 sm:h-16" />
    </main>
  );
}
