"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const SOFA_LOTTIE_SRC = "https://lottie.host/1cabf097-f337-4289-ac12-2803976b20c8/NRaEVKRIF4.lottie";

type SofaLottieAnimationProps = {
  className?: string;
};

export default function SofaLottieAnimation({ className }: SofaLottieAnimationProps) {
  const mergedClassName = className ? `h-full w-full ${className}` : "h-full w-full";

  return (
    <DotLottieReact
      src={SOFA_LOTTIE_SRC}
      loop
      autoplay
      backgroundColor="#00000000"
      className={mergedClassName}
      renderConfig={{ autoResize: true, devicePixelRatio: 2 }}
    />
  );
}
