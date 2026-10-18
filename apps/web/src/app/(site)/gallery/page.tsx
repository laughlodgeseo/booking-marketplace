import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  GALLERY_ITEMS,
  GALLERY_CATEGORY_LABEL,
} from "@/lib/content/gallery-items";
import { getRequestLocale } from "@/lib/i18n/server";
import { PageHeading } from "@/components/inside-story/Editorial";
import { SceneImage } from "@/components/inside-story/Motion";
export const metadata: Metadata = {
  title: "Look inside",
  description:
    "A photographic archive of interiors, quiet details and Dubai inspiration. Explore spaces by room and atmosphere.",
};
const arabic: Record<string, string> = {
  LIVING_ROOM: "غرف المعيشة",
  BEDROOM: "غرف النوم",
  KITCHEN_DINING: "المطابخ والطعام",
  BATHROOM: "الحمامات",
  BALCONY_VIEW: "الشرفات والإطلالات",
  POOL_AMENITIES: "المسابح والمرافق",
  NEIGHBORHOOD: "الأحياء",
};
export default async function GalleryPage() {
  const ar = (await getRequestLocale()) === "ar";
  return (
    <>
      <PageHeading
        context={ar ? "المعرض الفوتوغرافي" : "The photographic archive"}
        title={ar ? "مساحات تستحق التأمل." : "A closer look at the inside."}
        intro={
          ar
            ? "ضوء وملمس ومساحة للتخيل. صور للإلهام، وليست قوائم عقارات قابلة للحجز."
            : "Light. Texture. Space to imagine. An editorial collection of interiors and atmosphere, independent of bookable inventory."
        }
      />
      <nav
        className="story-gallery-nav"
        aria-label={ar ? "فئات المعرض" : "Gallery collections"}
      >
        {GALLERY_ITEMS.map((item) => (
          <a key={item.id} href={`#${item.slug}`}>
            {ar ? arabic[item.category] : GALLERY_CATEGORY_LABEL[item.category]}
          </a>
        ))}
      </nav>
      <div className="story-archive">
        {GALLERY_ITEMS.map((item) => (
          <Link
            href={`/gallery/${item.slug}`}
            key={item.id}
            data-stay-key={item.cover.src}
            id={item.slug}
            className="story-archive-item"
          >
            <SceneImage
              src={item.cover.src}
              alt={
                ar
                  ? arabic[item.category]
                  : GALLERY_CATEGORY_LABEL[item.category]
              }
              sizes="(max-width:700px) 90vw, 45vw"
            />
            <h2>
              {ar
                ? arabic[item.category]
                : GALLERY_CATEGORY_LABEL[item.category]}
              <ArrowUpRight size={25} />
            </h2>
            <p>
              {ar
                ? "اكتشف المجموعة. تفاصيل تمنح كل مساحة شخصيتها."
                : "Explore the collection. A study in the details that give a space its character."}
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
