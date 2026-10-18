import Image from "next/image";
export function DubaiAuthCollageBackground() {
  return (
    <div
      className="story-auth-choice-bg pointer-events-none fixed inset-0"
      aria-hidden="true"
    >
      <Image
        src="/images/home/interior-suite.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
    </div>
  );
}
