import Link from "next/link";
import { BLOG_POSTS, type BlogPost } from "@/lib/content/blog-posts";
import Clamp from "@/components/ui/Clamp";

function PostCard({ p }: { p: BlogPost }) {
  return (
    <Link
      href={`/blog/${p.slug}`}
      className="premium-card premium-card-tinted premium-card-hover card-accent-left group overflow-hidden rounded-2xl"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.coverUrl}
          alt={p.title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-dark-1/55 via-dark-2/10 to-transparent" />
        <div className="absolute left-4 top-4 rounded-full border border-line bg-accent-soft/80 px-3 py-1.5 text-xs font-extrabold text-primary backdrop-blur">
          {p.tag}
        </div>
      </div>

      <div className="space-y-2 p-4 sm:p-5">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-secondary/60">
          {p.dateLabel}
        </p>
        <Clamp as="h3" lines={2} className="text-base font-semibold leading-snug text-primary">
          {p.title}
        </Clamp>
        <Clamp as="p" lines={3} className="text-sm text-secondary/75">
          {p.excerpt}
        </Clamp>
        <div className="pt-2 text-sm font-extrabold text-primary">
          Read more <span aria-hidden className="ml-1 text-secondary/60">→</span>
        </div>
        <div className="h-1.5 w-12 rounded-full bg-brand/45" />
      </div>
    </Link>
  );
}

export default function BlogGrid() {
  return (
    <section className="relative w-full py-8 sm:py-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.22em] text-secondary/70 shadow-sm backdrop-blur">
            <span className="inline-block h-2 w-2 rounded-full bg-brand" />
            Latest
          </p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
            Fresh reads
          </h2>
          <p className="mt-2 text-sm text-secondary/75 sm:text-base">
            Easy reads on booking, locations, and better guest experience.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {BLOG_POSTS.map((p) => (
            <PostCard key={p.slug} p={p} />
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-accent-soft/80 blur-3xl" />
      </div>
    </section>
  );
}
