"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useId, useMemo } from "react";
import { type AuthFlowPanel } from "@/components/auth/authFlow";

interface BlobImageAsset {
  src: string;
  alt: string;
}

interface AuthBlobImageProps {
  panel: AuthFlowPanel;
  edge?: "left" | "right";
  className?: string;
}

const IMAGE_BY_PANEL: Record<AuthFlowPanel, BlobImageAsset> = {
  login: {
    src: "/areas/dubai-marina.jpg",
    alt: "Dubai Marina skyline at sunset",
  },
  signup: {
    src: "/areas/downtown-dubai.jpg",
    alt: "Downtown Dubai skyline with modern towers",
  },
  forgot: {
    src: "/areas/business-bay.jpg",
    alt: "Dubai Business Bay waterfront skyline",
  },
};

const IMAGE_TRANSITION = {
  duration: 0.52,
  ease: [0.22, 1, 0.36, 1] as const,
};

const LEFT_EDGE_BLOB_PATH =
  "M0.34 0 C0.20 0.08 0.08 0.20 0.06 0.34 C0.05 0.48 0.14 0.60 0.20 0.70 C0.26 0.80 0.18 0.92 0.05 1 L1 1 L1 0 Z";

const RIGHT_EDGE_BLOB_PATH =
  "M0 0 L0 1 L0.95 1 C0.82 0.92 0.74 0.80 0.80 0.70 C0.86 0.60 0.95 0.48 0.94 0.34 C0.92 0.20 0.80 0.08 0.66 0 Z";

export function AuthBlobImage({ panel, edge = "left", className }: AuthBlobImageProps) {
  const reactId = useId();
  const clipId = useMemo(() => `auth-blob-mask-${reactId.replace(/:/g, "")}`, [reactId]);
  const image = IMAGE_BY_PANEL[panel];
  const blobPath = edge === "left" ? LEFT_EDGE_BLOB_PATH : RIGHT_EDGE_BLOB_PATH;

  return (
    <div className={`relative h-full w-full overflow-hidden ${className ?? ""}`}>
      <svg className="pointer-events-none absolute h-0 w-0" aria-hidden="true">
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path d={blobPath} />
          </clipPath>
        </defs>
      </svg>

      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          clipPath: `url(#${clipId})`,
          WebkitClipPath: `url(#${clipId})`,
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={panel}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={IMAGE_TRANSITION}
            className="absolute inset-0"
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority={panel === "login"}
              sizes="(max-width: 767px) 100vw, (max-width: 1023px) 42vw, 44vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(150deg,rgba(255,255,255,0.28)_0%,rgba(245,251,255,0.00)_36%,rgba(23,43,84,0.32)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(68%_48%_at_26%_14%,rgba(250,252,255,0.36)_0%,rgba(250,252,255,0.00)_72%)]" />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
