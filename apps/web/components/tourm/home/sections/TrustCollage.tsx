import Image from "next/image";

export default function TrustCollage() {
  return (
    <div className="relative w-full max-w-[460px] aspect-[4/5]">
      <div
        aria-hidden
        className="absolute inset-[8%_4%_10%_8%] rounded-[38px] bg-[radial-gradient(70%_72%_at_50%_44%,rgba(184,115,51,0.14),rgba(79,70,229,0.10)_58%,transparent_86%)] blur-3xl"
      />
      <div className="relative h-full w-full">
        <div className="absolute left-0 top-0 z-10 h-[88%] w-[78%] overflow-hidden rounded-[32px] border border-white/70 shadow-[0_30px_70px_rgba(30,27,75,0.12)]">
          <Image
            src="/images/home/interior-suite.webp"
            alt="Luxury apartment interior in Dubai"
            fill
            sizes="(max-width: 1023px) 78vw, 360px"
            quality={90}
            priority={false}
            className="object-cover saturate-[1.05] contrast-[1.05]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#17151f]/16 via-transparent to-white/8" />
        </div>

        <div className="absolute bottom-0 right-0 z-20 h-[42%] w-[55%] overflow-hidden rounded-[26px] border border-white/70 shadow-[0_24px_58px_rgba(30,27,75,0.14)]">
          <Image
            src="/images/home/trust-skyline.webp"
            alt="Dubai skyline at golden hour"
            fill
            sizes="(max-width: 1023px) 55vw, 250px"
            quality={90}
            priority={false}
            className="object-cover saturate-[1.05] contrast-[1.05]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#17151f]/20 via-transparent to-white/8" />
        </div>
      </div>
    </div>
  );
}
