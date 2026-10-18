import PageDepth from "@/components/inside-story/PageDepth";
import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_POSTS } from "@/lib/content/blog-posts";
import { getRequestLocale } from "@/lib/i18n/server";
import { PageHeading } from "@/components/inside-story/Editorial";
import { SceneImage } from "@/components/inside-story/Motion";
export const metadata: Metadata = {
  title: "The journal",
  description:
    "Notes on Dubai, choosing your neighborhood and making the most of a holiday-home stay.",
};
export default async function BlogPage() {
  const ar = (await getRequestLocale()) === "ar";
  return (
    <>
      <PageHeading
        context={ar ? "المجلة" : "The journal"}
        title={ar ? "قليل من المعرفة المحلية." : "A little local perspective."}
        intro={
          ar
            ? "أفكار وأدلة لاكتشاف دبي وإقامة أكثر راحة. المقالات متاحة بالإنجليزية."
            : "Notes from the city. Places to explore. Things worth knowing before you open the door."
        }
      />
      <div className="story-journal">
        {BLOG_POSTS.map((post, i) => (
          <Link
            className="story-journal-post"
            key={post.slug}
            href={`/blog/${post.slug}`}
          >
            <SceneImage
              src={post.coverUrl}
              alt={post.title}
              sizes={i === 0 ? "90vw" : "(max-width:700px) 90vw, 45vw"}
            />
            <div>
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
              <span className="story-link">
                {ar ? "اقرأ المقال" : "Read the story"} ↗
              </span>
            </div>
          </Link>
        ))}
      </div>
      <PageDepth page="blog" ar={ar} />
    </>
  );
}
