import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  GALLERY_ITEMS,
  GALLERY_CATEGORY_LABEL,
} from "@/lib/content/gallery-items";
import { getRequestLocale } from "@/lib/i18n/server";
import { PageHeading, NextRoute } from "@/components/inside-story/Editorial";
import { SceneImage } from "@/components/inside-story/Motion";
type Props = { params: Promise<{ slug: string }> };
const arabic: Record<string, string> = {
  LIVING_ROOM: "غرف المعيشة",
  BEDROOM: "غرف النوم",
  KITCHEN_DINING: "المطابخ والطعام",
  BATHROOM: "الحمامات",
  BALCONY_VIEW: "الشرفات والإطلالات",
  POOL_AMENITIES: "المسابح والمرافق",
  NEIGHBORHOOD: "الأحياء",
};
export function generateStaticParams() {
  return GALLERY_ITEMS.map((item) => ({ slug: item.slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = GALLERY_ITEMS.find((x) => x.slug === slug);
  return {
    title: item ? GALLERY_CATEGORY_LABEL[item.category] : "Gallery",
    description: "An editorial photographic study of spaces and atmosphere.",
  };
}
export default async function GalleryStudy({ params }: Props) {
  const { slug } = await params;
  const item = GALLERY_ITEMS.find((x) => x.slug === slug);
  if (!item) notFound();
  const ar = (await getRequestLocale()) === "ar";
  const name = ar
    ? arabic[item.category]
    : GALLERY_CATEGORY_LABEL[item.category];
  return (
    <>
      <PageHeading
        context={ar ? "دراسة فوتوغرافية" : "A photographic study"}
        title={name}
        intro={
          ar
            ? "مجموعة صور للإلهام. هذه الصور مستقلة عن قوائم العقارات المتاحة للحجز."
            : "A collection of spaces to spend a little time with. Editorial inspiration, independent of bookable property listings."
        }
      />
      <div className="story-gallery-study">
        <SceneImage
          src={item.cover.src}
          alt={name}
          priority
          continuityKey={item.cover.src}
        />
        <div className="story-gallery-study-grid">
          {item.gallery
            .filter((im) => im.src !== item.cover.src)
            .map((im, i) => (
              <figure key={im.id}>
                <SceneImage
                  src={im.src}
                  alt={`${name} — ${i + 2}`}
                  sizes="(max-width:700px) 90vw, 50vw"
                />
                <figcaption>
                  {name} / {String(i + 2).padStart(2, "0")}
                </figcaption>
              </figure>
            ))}
        </div>
        <Link className="story-link" href="/gallery">
          {ar ? "العودة إلى المعرض" : "Back to the archive"}
        </Link>
      </div>
      <NextRoute
        title={
          ar
            ? "حوّل الإلهام إلى رحلة."
            : "From inspiration to a place of your own."
        }
        label={ar ? "استكشف الإقامات" : "Explore stays"}
        href="/properties"
      />
    </>
  );
}
