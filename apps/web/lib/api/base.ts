const DEFAULT_API_ORIGIN = "http://localhost:3001";
const DEFAULT_API_BASE_PATH = "/api";

function splitPathSuffix(path: string): { pathname: string; suffix: string } {
  const q = path.indexOf("?");
  const h = path.indexOf("#");

  let cut = -1;
  if (q >= 0 && h >= 0) cut = Math.min(q, h);
  else if (q >= 0) cut = q;
  else if (h >= 0) cut = h;

  if (cut < 0) return { pathname: path, suffix: "" };
  return { pathname: path.slice(0, cut), suffix: path.slice(cut) };
}

function normalizeApiPath(path: string): string {
  const raw = (path ?? "").trim();
  if (!raw) return "/";

  const { pathname, suffix } = splitPathSuffix(raw);
  let p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  p = p.replace(/\/{2,}/g, "/");

  if (p === "/api") p = "/";
  else if (p.startsWith("/api/")) p = p.slice(4) || "/";

  return `${p}${suffix}`;
}

function normalizeOrigin(input: string | undefined): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  return parsed.origin;
}

function normalizeBasePath(pathname: string): string {
  const raw = (pathname ?? "").trim();
  if (!raw) return "/";

  let path = raw.startsWith("/") ? raw : `/${raw}`;
  path = path.replace(/\/{2,}/g, "/");
  if (path.length > 1) {
    path = path.replace(/\/+$/g, "");
  }
  return path || "/";
}

function readBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return fallback;
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }
  return fallback;
}

function shouldUseSameOriginApiInBrowser(): boolean {
  if (typeof window === "undefined") return false;
  // Default ON so browser requests go through Next rewrites (/api -> backend),
  // making auth cookies first-party and more reliable across browsers.
  return readBooleanEnv(process.env.NEXT_PUBLIC_API_USE_PROXY, true);
}

function readApiBaseFromEnv(): string | null {
  const raw = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new Error(
        `Invalid NEXT_PUBLIC_API_BASE_URL: "${raw}". Expected an absolute URL or relative path like /api.`,
      );
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(
        `Invalid NEXT_PUBLIC_API_BASE_URL protocol: "${parsed.protocol}". Use http or https.`,
      );
    }

    const basePath = normalizeBasePath(parsed.pathname);
    const finalPath = basePath === "/" ? DEFAULT_API_BASE_PATH : basePath;
    return `${parsed.origin}${finalPath}`;
  }

  const basePath = normalizeBasePath(raw);
  return basePath === "/" ? DEFAULT_API_BASE_PATH : basePath;
}

function readOriginFromEnv(): string {
  const fromOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_API_ORIGIN);
  return fromOrigin ?? DEFAULT_API_ORIGIN;
}

export function apiOrigin(): string {
  const raw = readOriginFromEnv();
  let parsed: URL;

  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(
      `Invalid NEXT_PUBLIC_API_ORIGIN: "${raw}". Expected absolute origin like https://rentpropertyuae.onrender.com`,
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `Invalid NEXT_PUBLIC_API_ORIGIN protocol: "${parsed.protocol}". Use http or https.`,
    );
  }

  // Enforce origin-only behavior even if env accidentally includes a path.
  return parsed.origin;
}

export function apiBaseUrl(): string {
  if (shouldUseSameOriginApiInBrowser()) {
    return DEFAULT_API_BASE_PATH;
  }
  const fromBase = readApiBaseFromEnv();
  if (fromBase) return fromBase;
  return `${apiOrigin()}${DEFAULT_API_BASE_PATH}`;
}

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test((path ?? "").trim())) return path.trim();

  const base = apiBaseUrl();
  const normalizedPath = normalizeApiPath(path);
  return normalizedPath === "/" ? base : `${base}${normalizedPath}`;
}
