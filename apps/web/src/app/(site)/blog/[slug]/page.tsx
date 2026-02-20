import type { Metadata } from "next";
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
    <main className="min-h-screen bg-transparent">
      <article className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-secondary">{post.tag}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-primary sm:text-4xl">{post.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-secondary/80 sm:text-base">{post.excerpt}</p>

        <div className="mt-8 overflow-hidden rounded-[2rem] border border-line/70 bg-surface shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.coverUrl} alt={post.title} className="h-full w-full object-cover" />
        </div>

        <div className="premium-card premium-card-tinted mt-8 rounded-3xl p-6 sm:p-8">
          <div className="space-y-4 text-sm leading-relaxed text-secondary/85 sm:text-base">
            {post.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <Link
            href="/blog"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-line bg-surface px-4 text-sm font-semibold text-primary transition hover:bg-accent-soft/55"
          >
            {locale === "ar" ? "العودة إلى المدونة" : "Back to blog"}
          </Link>
        </div>
      </article>
    </main>
  );
}
