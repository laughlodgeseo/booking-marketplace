import Image from "next/image";

export default function TrustCollage() {
  return (
    <div className="relative w-full max-w-[460px] aspect-[4/5]">
      <div className="relative h-full w-full">
        <div className="absolute left-0 top-0 z-10 h-[88%] w-[78%] overflow-hidden rounded-[34px] border border-black/5 shadow-[0_35px_90px_-70px_rgba(0,0,0,0.65)]">
          <Image
            src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2200&q=90"
            alt="Luxury apartment interior in Dubai"
            fill
            sizes="(max-width: 1023px) 78vw, 360px"
            quality={90}
            priority={false}
            className="object-cover saturate-[1.05] contrast-[1.05]"
          />
        </div>

        <div className="absolute bottom-0 right-0 z-20 h-[42%] w-[55%] overflow-hidden rounded-[28px] border border-black/5 shadow-[0_35px_90px_-70px_rgba(0,0,0,0.65)]">
          <Image
            src="https://images.unsplash.com/photo-1526495124232-a04e1849168c?auto=format&fit=crop&w=2200&q=90"
            alt="Dubai skyline at golden hour"
            fill
            sizes="(max-width: 1023px) 55vw, 250px"
            quality={90}
            priority={false}
            className="object-cover saturate-[1.05] contrast-[1.05]"
          />
        </div>
      </div>
    </div>
  );
}
