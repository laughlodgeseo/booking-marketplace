import Link from "next/link";

export default function GalleryCta() {
  return (
    <section className="relative w-full pb-16 pt-6 sm:pb-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#4F46E5] via-[#4338CA] to-[#3730A3] shadow-[0_26px_64px_rgba(46,31,140,0.34)]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 top-[-6rem] h-72 w-72 rounded-full bg-indigo-200/26 blur-3xl" />
            <div className="absolute -right-20 bottom-[-7rem] h-72 w-72 rounded-full bg-sky-200/20 blur-3xl" />
          </div>

          <div className="relative grid gap-8 p-8 sm:p-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.22em] text-primary shadow-[0_10px_24px_rgba(15,23,42,0.14)]">
                <span className="inline-block h-2 w-2 rounded-full bg-brand" />
                Next
              </p>

              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Ready to check availability?
              </h3>
              <p className="mt-3 text-sm text-white/84 sm:text-base">
                Pick dates, get a clear quote, and reserve safely with inventory holds.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/properties"
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-[#0B0F19] shadow-[0_14px_32px_rgba(11,15,25,0.2)] transition hover:bg-indigo-50"
                >
                  Browse stays
                </Link>
                <Link
                  href="/contact"
                  className="rounded-2xl bg-white/14 px-5 py-3 text-sm font-extrabold text-white ring-1 ring-white/44 transition hover:bg-white/22"
                >
                  Contact us
                </Link>
              </div>
            </div>

            <div className="rounded-[1.55rem] border border-white/72 bg-white/90 p-6 text-primary shadow-[0_18px_42px_rgba(15,23,42,0.17)]">
              <p className="text-sm font-extrabold text-primary">What you get</p>
              <ul className="mt-4 space-y-2">
                {[
                  "Live availability by date",
                  "Clear quote breakdown",
                  "Safe inventory holds",
                  "Clear cancellation policies",
                ].map((b) => (
                  <li key={b} className="flex gap-3 text-sm text-secondary/82">
                    <span className="mt-1 inline-block h-2 w-2 rounded-full bg-brand/60" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 h-1.5 w-12 rounded-full bg-brand/45" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
