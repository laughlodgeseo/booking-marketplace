import {
  JournalStories,
  ConnectedPaths,
} from "@/components/inside-story/PageDepth";
import type { Metadata } from "next";
import { PageHeading } from "@/components/inside-story/Editorial";
import { SceneImage } from "@/components/inside-story/Motion";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_POSTS } from "@/lib/content/blog-posts";
import { getRequestLocale } from "@/lib/i18n/server";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const post = BLOG_POSTS.find((entry) => entry.slug === slug);
  if (!post) return {};

  return {
    title: `${post.title} | Blog`,
    description: post.excerpt,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: `${post.title} | Laugh & Lodge`,
      description: post.excerpt,
      images: [{ url: post.coverUrl }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | Laugh & Lodge`,
      description: post.excerpt,
      images: [post.coverUrl],
    },
  };
}

export default async function BlogPostPage(props: PageProps) {
  const { slug } = await props.params;
  const locale = await getRequestLocale();
  const post = BLOG_POSTS.find((entry) => entry.slug === slug);
  if (!post) notFound();

  return (
    <>
      <article className="story-article">
        <PageHeading
          context={`${post.tag} · ${post.dateLabel}`}
          title={post.title}
          intro={post.excerpt}
        />
        <SceneImage src={post.coverUrl} alt={post.title} priority />
        <div className="story-article-body">
          {post.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <Link className="story-link" href="/blog">
            {locale === "ar" ? "العودة إلى المجلة" : "Back to the journal"} ↗
          </Link>
        </div>
      </article>
      <JournalStories ar={locale === "ar"} exclude={post.slug} />
      <ConnectedPaths ar={locale === "ar"} />
    </>
  );
}
