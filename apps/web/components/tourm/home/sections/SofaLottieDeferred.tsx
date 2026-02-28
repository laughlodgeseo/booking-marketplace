"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

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
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const node = hostRef.current;
    if (!node || shouldLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "220px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div ref={hostRef} className={className ? `h-full w-full ${className}` : "h-full w-full"}>
      {shouldLoad ? <SofaLottieAnimation className="h-full w-full" /> : null}
    </div>
  );
}
