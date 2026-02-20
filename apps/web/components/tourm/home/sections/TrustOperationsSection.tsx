import TrustFeaturesList from "@/components/tourm/home/sections/TrustFeaturesList";
import TrustCollage from "@/components/tourm/home/sections/TrustCollage";

export default function TrustOperationsSection() {
  return (
    <section className="relative overflow-hidden py-16 md:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-120px] top-[-120px] h-[420px] w-[420px] rounded-full bg-indigo-200/35 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-140px] right-[-140px] h-[460px] w-[460px] rounded-full bg-cyan-200/35 blur-3xl"
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 md:px-6">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <TrustCollage />
          </div>

          <div className="lg:col-span-7">
            <TrustFeaturesList />
          </div>
        </div>
      </div>
    </section>
  );
}
