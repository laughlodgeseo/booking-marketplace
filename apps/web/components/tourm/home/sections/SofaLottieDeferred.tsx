"use client";

import dynamic from "next/dynamic";

type SofaLottieDeferredProps = {
  className?: string;
};

const SofaLottieAnimation = dynamic(
  () => import("@/components/tourm/home/sections/SofaLottieAnimation"),
  {
    ssr: false,
    loading: () => null,
  },
);

export default function SofaLottieDeferred({ className }: SofaLottieDeferredProps) {
  return <SofaLottieAnimation className={className} />;
}
