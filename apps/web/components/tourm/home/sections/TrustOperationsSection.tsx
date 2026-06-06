import TrustFeaturesList from "@/components/tourm/home/sections/TrustFeaturesList";
import TrustCollage from "@/components/tourm/home/sections/TrustCollage";

export default function TrustOperationsSection() {
  return (
    <section className="home-trust-section relative overflow-hidden py-12 md:py-16 lg:py-[4.5rem]">
      <div
        aria-hidden
        className="home-section-fade-top pointer-events-none absolute inset-x-0 top-0 h-24"
      />
      <div
        aria-hidden
        className="home-section-fade-bottom pointer-events-none absolute inset-x-0 bottom-0 h-28"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-150px] top-[-150px] h-[420px] w-[420px] rounded-full bg-indigo-200/24 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-160px] right-[-160px] h-[460px] w-[460px] rounded-full bg-[#d7b98e]/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[8%] top-[18%] h-56 w-56 rounded-full bg-emerald-100/20 blur-3xl"
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 md:px-6">
        <div className="grid grid-cols-1 items-center gap-9 lg:grid-cols-12 lg:gap-14">
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
