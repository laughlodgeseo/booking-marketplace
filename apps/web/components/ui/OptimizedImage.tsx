"use client";

import { useState } from "react";
import Image from "next/image";
import { getOptimizedImage, getBlurPlaceholder } from "@/lib/cloudinary";

type OptimizedImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
  quality?: number;
};

/**
 * Optimized image component with:
 * - Cloudinary auto-format (WebP/AVIF) and quality optimization
 * - Blur placeholder for Cloudinary images
 * - Shimmer fallback for non-Cloudinary images
 * - Error fallback
 * - Responsive sizing via Next.js Image
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill,
  className = "",
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  priority = false,
  quality,
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-warm-alt/40 text-xs text-muted ${fill ? "absolute inset-0" : ""} ${className}`}
        style={!fill ? { width, height } : undefined}
      >
        No image
      </div>
    );
  }

  // Apply Cloudinary transformations if applicable
  const resolvedWidth = fill ? 800 : (width ?? 800);
  const optimizedSrc = getOptimizedImage(src, resolvedWidth);
  const blurUrl = getBlurPlaceholder(src);
  const hasBlur = blurUrl.length > 0;

  // When fill=true, the wrapper must be positioned and sized to fill its parent.
  // Using "absolute inset-0" ensures the wrapper fills the nearest `position:relative`
  // ancestor — the wrapper div itself then becomes the positioned parent for the Image.
  // Without this, the wrapper collapses to 0 height (absolutely-positioned Image is
  // out of flow) and the image is invisible.
  const wrapperClass = fill
    ? `absolute inset-0 overflow-hidden ${className}`
    : `relative overflow-hidden ${className}`;

  return (
    <div className={wrapperClass}>
      {/* Shimmer placeholder for non-Cloudinary images (Cloudinary uses blur) */}
      {!loaded && !hasBlur && (
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(226,218,203,0.55),rgba(245,239,228,0.78),rgba(226,218,203,0.55))] bg-size-[220%_100%] animate-[shimmer_1.4s_ease-in-out_infinite]" />
      )}
      <Image
        src={optimizedSrc}
        alt={alt}
        width={fill ? undefined : (width ?? 800)}
        height={fill ? undefined : (height ?? 600)}
        fill={fill}
        sizes={sizes}
        priority={priority}
        quality={quality}
        loading={priority ? "eager" : "lazy"}
        {...(hasBlur
          ? { placeholder: "blur" as const, blurDataURL: blurUrl }
          : {})}
        className={`transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${fill ? "object-cover" : ""}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}
