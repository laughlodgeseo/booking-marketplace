import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/lib/auth/tokenStore";
import { apiUrl } from "@/lib/api/base";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type HttpError = {
  ok: false;
  status: number; // 0 for network/URL construction errors
  message: string;
  details?: unknown;
};

export type HttpOk<T> = {
  ok: true;
  status: number;
  data: T;
};

export type HttpResult<T> = HttpOk<T> | HttpError;

type Json = object | unknown[] | string | number | boolean | null;
type ResponseType = "json" | "text" | "blob";
type RefreshPayload = { accessToken?: unknown };

let refreshInFlight: Promise<string | null> | null = null;

function isJsonResponse(res: Response): boolean {
  const ct = res.headers.get("content-type") ?? "";
  return ct.includes("application/json");
}

/**
 * Nest validation errors commonly look like:
 * { statusCode: 400, message: ["...", "..."], error: "Bad Request" }
 * or:
 * { message: "Some string" }
 * or:
 * { errors: [{ message: "..." }, ...] }
 *
 * Convert those into a single readable string.
 */
function pickMessageFromJson(j: unknown): string | null {
  if (typeof j !== "object" || j === null) return null;

  const asAny = j as {
    message?: unknown;
    error?: unknown;
    errors?: unknown;
  };

  const msg = asAny.message;

  // message: "..."
  if (typeof msg === "string" && msg.trim()) return msg;

  // message: ["...", "..."]
  if (Array.isArray(msg)) {
    const parts = msg
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts.join("\n");
  }

  // errors: [{ message: "..." }, ...]
  if (Array.isArray(asAny.errors)) {
    const parts = asAny.errors
      .map((e) => {
        if (typeof e === "string") return e;
        if (typeof e !== "object" || e === null) return null;
        const m = (e as { message?: unknown }).message;
        return typeof m === "string" ? m : null;
      })
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts.join("\n");
  }

  // error: "Bad Request"
  const err = asAny.error;
  if (typeof err === "string" && err.trim()) return err;

  return null;
}

function shouldDebugRequest(path: string): boolean {
  const p = path.toLowerCase();
  return p.includes("/auth/login") || p.includes("/calendar");
}

function resolveRequestUrl(path: string): URL {
  const raw = apiUrl(path);
  if (/^https?:\/\//i.test(raw)) {
    return new URL(raw);
  }
  if (typeof window !== "undefined") {
    return new URL(raw, window.location.origin);
  }
  throw new Error(`Relative API URL cannot be resolved on server: ${raw}`);
}

function maybeRedirectToLoginOnAuthFailure(path: string): void {
  if (typeof window === "undefined") return;

  const requestPath = path.toLowerCase();
  if (requestPath.includes("/auth/")) return;

  const currentPath = window.location.pathname.toLowerCase();
  if (
    currentPath.startsWith("/login") ||
    currentPath.startsWith("/auth") ||
    currentPath.startsWith("/verify-email")
  ) {
    return;
  }

  const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const query = new URLSearchParams();
  if (next && next !== "/") {
    query.set("next", next);
  }

  const target = query.toString() ? `/login?${query.toString()}` : "/login";
  window.location.assign(target);
}

function canTryRefresh(path: string, authMode: "auto" | "none"): boolean {
  if (authMode !== "auto") return false;
  const p = path.toLowerCase();
  if (!p.includes("/auth/")) return true;
  return !p.includes("/auth/refresh") && !p.includes("/auth/login");
}

async function refreshAccessToken(debugLog: boolean): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    let refreshUrl: string;
    try {
      refreshUrl = apiUrl("/auth/refresh");
    } catch {
      clearAccessToken();
      return null;
    }

    try {
      const res = await fetch(refreshUrl, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        clearAccessToken();
        return null;
      }

      const json = (await res.json().catch(() => null)) as RefreshPayload | null;
      const accessToken =
        typeof json?.accessToken === "string" && json.accessToken.trim()
          ? json.accessToken.trim()
          : null;

      if (!accessToken) {
        clearAccessToken();
        return null;
      }

      setAccessToken(accessToken);
      if (debugLog) {
        console.info("[apiFetch] access token refreshed");
      }
      return accessToken;
    } catch {
      clearAccessToken();
      return null;
    }
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function apiFetch<T>(
  path: string,
  opts?: {
    method?: HttpMethod;
    query?: Record<string, string | number | boolean | null | undefined>;
    body?: Json | FormData; // supports JSON or multipart
    headers?: Record<string, string>;
    credentials?: RequestCredentials;
    cache?: RequestCache;
    next?: { revalidate?: number };
    auth?: "auto" | "none"; // auto attaches Bearer if token exists
    responseType?: ResponseType; // defaults to auto/json
  }
): Promise<HttpResult<T>> {
  const method = opts?.method ?? "GET";
  const debugLog =
    process.env.NODE_ENV !== "production" && shouldDebugRequest(path);

  let url: URL;
  try {
    url = resolveRequestUrl(path);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid URL";
    return { ok: false, status: 0, message: msg };
  }

  if (debugLog) {
    console.info(`[apiFetch] ${method} ${url.toString()}`);
  }

  if (opts?.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v === null || v === undefined) continue;
      url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {
    ...(opts?.headers ?? {}),
  };

  const authMode = opts?.auth ?? "auto";
  const accessToken = authMode === "auto" ? getAccessToken() : null;

  // attach Authorization by default (unless disabled)
  if (authMode === "auto") {
    if (accessToken && !headers.Authorization) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  const hadBearerToken =
    typeof headers.Authorization === "string" &&
    headers.Authorization.trim().length > 0;

  let body: BodyInit | undefined = undefined;

  // JSON vs FormData
  const rawBody = opts?.body;
  if (rawBody !== undefined) {
    if (typeof FormData !== "undefined" && rawBody instanceof FormData) {
      body = rawBody; // browser sets boundary
    } else {
      headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
      body = JSON.stringify(rawBody);
    }
  }

  // ✅ IMPORTANT: default to cookie-friendly requests for auth refresh token cookie (HttpOnly)
  const credentials: RequestCredentials = opts?.credentials ?? "include";

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      body,
      credentials,
      cache: opts?.cache,
      next: opts?.next,
    });
  } catch (err) {
    if (debugLog) {
      console.error(
        `[apiFetch] ${method} ${url.toString()} -> network error`,
        err
      );
    }
    const msg = err instanceof Error ? err.message : "Network error";
    return { ok: false, status: 0, message: msg };
  }

  const status = res.status;
  if (debugLog) {
    console.info(`[apiFetch] ${method} ${url.toString()} -> ${status}`);
  }

  let refreshAttempted = false;
  if (status === 401 && canTryRefresh(path, authMode)) {
    refreshAttempted = true;
    const nextToken = await refreshAccessToken(debugLog);
    if (nextToken) {
      const retryHeaders: Record<string, string> = {
        ...headers,
        Authorization: `Bearer ${nextToken}`,
      };

      try {
        res = await fetch(url.toString(), {
          method,
          headers: retryHeaders,
          body,
          credentials,
          cache: opts?.cache,
          next: opts?.next,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Network error";
        return { ok: false, status: 0, message: msg };
      }
    }
  }

  const finalStatus = res.status;
  if (debugLog && finalStatus !== status) {
    console.info(
      `[apiFetch] ${method} ${url.toString()} -> retry status ${finalStatus}`
    );
  }

  if (finalStatus === 401 && refreshAttempted && hadBearerToken) {
    clearAccessToken();
    maybeRedirectToLoginOnAuthFailure(path);
  }

  if (!res.ok) {
    let message = `Request failed (${finalStatus})`;
    let details: unknown = undefined;

    if (isJsonResponse(res)) {
      try {
        const j = (await res.json()) as unknown;
        details = j;
        message = pickMessageFromJson(j) ?? message;
      } catch {
        // ignore
      }
    } else {
      try {
        const t = await res.text();
        if (t.trim().length > 0) message = t;
      } catch {
        // ignore
      }
    }

    return { ok: false, status: finalStatus, message, details };
  }

  if (finalStatus === 204) {
    return { ok: true, status: finalStatus, data: undefined as T };
  }

  const rt = opts?.responseType;

  if (rt === "blob") {
    const data = (await res.blob()) as unknown as T;
    return { ok: true, status: finalStatus, data };
  }

  if (rt === "text") {
    const text = (await res.text()) as unknown as T;
    return { ok: true, status: finalStatus, data: text };
  }

  if (isJsonResponse(res)) {
    const data = (await res.json()) as T;
    return { ok: true, status: finalStatus, data };
  }

  const text = (await res.text()) as unknown as T;
  return { ok: true, status: finalStatus, data: text };
}
