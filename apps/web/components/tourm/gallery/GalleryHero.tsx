import Link from "next/link";

export default function GalleryHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#4F46E5] via-[#4338CA] to-[#3730A3] text-white shadow-[inset_0_-24px_42px_rgba(11,15,25,0.16)]">
      <div className="absolute inset-0">
        <div className="absolute -left-24 top-[-9rem] h-[22rem] w-[22rem] rounded-full bg-indigo-300/34 blur-3xl" />
        <div className="absolute -right-24 bottom-[-8rem] h-[20rem] w-[20rem] rounded-full bg-sky-200/20 blur-3xl" />
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(248,250,252,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,0.12)_1px,transparent_1px)] [background-size:34px_34px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-12 sm:px-6 sm:pt-14 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/74">
            Gallery
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            A closer look at our stays
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/84 sm:text-base">
            Explore interiors, views, and the details that make a stay feel effortless.
            Our listings are backed by inventory-safe booking logic — the visuals match real availability.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/properties"
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#0B0F19] shadow-[0_12px_28px_rgba(11,15,25,0.24)] transition hover:bg-indigo-50"
            >
              Browse stays
            </Link>
            <Link
              href="/contact"
              className="rounded-xl bg-white/14 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/45 backdrop-blur transition hover:bg-white/20"
            >
              Contact us
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
