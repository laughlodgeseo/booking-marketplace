export default function Loading() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-5 w-36 rounded-xl bg-warm-alt/70" />
      <div className="mt-3 h-10 w-[460px] max-w-full rounded-xl bg-warm-alt/60" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-line bg-surface/[0.55]">
            <div className="h-[19rem] w-full bg-warm-alt/65" />
            <div className="space-y-3 p-4">
              <div className="h-4 w-3/4 rounded bg-warm-alt/60" />
              <div className="h-3 w-2/3 rounded bg-warm-alt/55" />
              <div className="h-3 w-1/3 rounded bg-warm-alt/55" />
              <div className="h-8 w-full rounded-xl bg-warm-alt/55" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
