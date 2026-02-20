export const LOCALE_COOKIE_NAME = "locale";

export const ALL_LOCALES = ["en", "ar"] as const;
export type AppLocale = (typeof ALL_LOCALES)[number];

function parseDefaultLocaleFromEnv(raw: string | undefined): AppLocale {
  const normalized = (raw ?? "").trim().toLowerCase();
  if (normalized === "ar") return "ar";
  return "en";
}

export const DEFAULT_LOCALE: AppLocale = parseDefaultLocaleFromEnv(
  process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
);

type TextDirection = "ltr" | "rtl";

function parseLocalesFromEnv(raw: string | undefined): AppLocale[] {
  const input = (raw ?? "").trim();
  if (!input) return [...ALL_LOCALES];

  const normalized = input
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is AppLocale => value === "en" || value === "ar");

  const unique = Array.from(new Set(normalized));
  return unique.length > 0 ? unique : [...ALL_LOCALES];
}

export const SUPPORTED_LOCALES = parseLocalesFromEnv(
  process.env.NEXT_PUBLIC_SUPPORTED_LOCALES,
);

export function normalizeLocale(value: string | null | undefined): AppLocale {
  const normalized = (value ?? "").trim().toLowerCase();
  return SUPPORTED_LOCALES.includes(normalized as AppLocale)
    ? (normalized as AppLocale)
    : DEFAULT_LOCALE;
}

export function directionForLocale(locale: AppLocale): TextDirection {
  return locale === "ar" ? "rtl" : "ltr";
}
