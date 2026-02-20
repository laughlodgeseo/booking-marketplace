import type { NextConfig } from "next";
import createBundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";

const DEFAULT_API_ORIGIN = "http://localhost:3001";

function normalizeOrigin(input: string | undefined): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) return null;

  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function resolveApiOrigin(): string {
  const fromOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_API_ORIGIN);
  if (fromOrigin) return fromOrigin;

  const fromBase = normalizeOrigin(process.env.NEXT_PUBLIC_API_BASE_URL);
  if (fromBase) return fromBase;

  return DEFAULT_API_ORIGIN;
}

const apiOrigin = resolveApiOrigin();
const apiUrl = new URL(apiOrigin);
const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${apiOrigin}/uploads/:path*`,
      },
    ];
  },
  images: {
    // Deliberate strategy (P2): keep passthrough while API/CDN media domains are finalized.
    // This avoids runtime breakage for mixed media origins during release hardening.
    unoptimized: true,
    qualities: [75, 90, 92, 100],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "plus.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "images.pexels.com", pathname: "/**" },
      {
        protocol: apiUrl.protocol.replace(":", "") as "http" | "https",
        hostname: apiUrl.hostname,
        pathname: "/uploads/**",
        ...(apiUrl.port ? { port: apiUrl.port } : {}),
      },
    ],
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
