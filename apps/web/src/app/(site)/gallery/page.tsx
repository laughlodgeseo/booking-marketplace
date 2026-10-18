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
import StoryRail from "@/components/inside-story/StoryRail";
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
      <StoryRail title={ar ? "غرفة تلو الأخرى." : "Room by room."}>
        {GALLERY_ITEMS.map((item) => (
          <Link
            href={`/gallery/${item.slug}`}
            key={item.id}
            data-stay-key={item.cover.src}
            id={item.slug}
            className="v3-space-panel"
          >
            <SceneImage
              src={item.cover.src}
              alt={
                ar
                  ? arabic[item.category]
                  : GALLERY_CATEGORY_LABEL[item.category]
              }
              sizes="(max-width:999px) 85vw, 74vw"
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
      </StoryRail>
    </>
  );
}
