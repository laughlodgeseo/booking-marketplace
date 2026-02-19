import Link from "next/link";

export default function BlogHero() {
  return (
    <section className="relative overflow-hidden border-b border-white/24 bg-gradient-to-br from-[#4F46E5] to-[#4338CA] text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(248,250,252,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,0.12)_1px,transparent_1px)] [background-size:34px_34px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-12 sm:px-6 sm:pt-14 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/74">
            Blog
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Travel tips, area guides, and hosting insights
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/84 sm:text-base">
            Original content only. No copied template text — aligned with our Dubai & UAE stays and operations.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/properties"
                className="inline-flex h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-[#0B0F19] shadow-[0_12px_28px_rgba(11,15,25,0.24)] transition hover:bg-indigo-50"
              >
                Browse stays
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-11 items-center rounded-xl border border-white/60 bg-transparent px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Contact us
              </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
