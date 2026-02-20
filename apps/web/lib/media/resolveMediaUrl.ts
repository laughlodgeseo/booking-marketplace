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

const API_ORIGIN = resolveApiOrigin();

export function resolveMediaUrl(mediaUrl: string | null | undefined): string {
  const raw = (mediaUrl ?? "").trim();
  if (!raw) return "";

  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/uploads/")) return `${API_ORIGIN}${raw}`;
  if (raw.startsWith("uploads/")) return `${API_ORIGIN}/${raw}`;
  if (raw.startsWith("/")) return `${API_ORIGIN}${raw}`;

  return `${API_ORIGIN}/uploads/properties/images/${raw}`;
}
