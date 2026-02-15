import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Deliberate strategy (P2): keep passthrough while API/CDN media domains are finalized.
    // This avoids runtime breakage for mixed media origins during release hardening.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
    ],
  },
};

export default nextConfig;
