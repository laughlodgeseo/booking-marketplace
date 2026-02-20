import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  type AppLocale,
  normalizeLocale,
} from "@/lib/i18n/config";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getLocaleFromClientCookie(): AppLocale {
  return normalizeLocale(readCookie(LOCALE_COOKIE_NAME));
}

export function setLocaleCookie(locale: AppLocale): void {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function getSafeLocale(value: string | null | undefined): AppLocale {
  return normalizeLocale(value ?? DEFAULT_LOCALE);
}
