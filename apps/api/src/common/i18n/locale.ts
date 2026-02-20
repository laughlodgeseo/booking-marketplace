export const SUPPORTED_LOCALES = ['en', 'ar'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const SUPPORTED_DISPLAY_CURRENCIES = [
  'AED',
  'USD',
  'SAR',
  'EUR',
  'GBP',
] as const;
export type DisplayCurrency = (typeof SUPPORTED_DISPLAY_CURRENCIES)[number];

export const DEFAULT_LOCALE: AppLocale = 'en';
export const DEFAULT_DISPLAY_CURRENCY: DisplayCurrency = 'AED';

function firstToken(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  const comma = trimmed.split(',')[0] ?? '';
  return comma.split(';')[0]?.trim() ?? '';
}

export function normalizeLocale(value: string | null | undefined): AppLocale {
  const normalized = firstToken(value ?? '').toLowerCase();
  if (normalized === 'ar' || normalized.startsWith('ar-')) return 'ar';
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en';
  return DEFAULT_LOCALE;
}

export function normalizeDisplayCurrency(
  value: string | null | undefined,
): DisplayCurrency {
  const normalized = firstToken(value ?? '').toUpperCase();
  if (
    (SUPPORTED_DISPLAY_CURRENCIES as readonly string[]).includes(normalized)
  ) {
    return normalized as DisplayCurrency;
  }
  return DEFAULT_DISPLAY_CURRENCY;
}

export function parseLocaleFromAcceptLanguage(
  header: string | null | undefined,
): AppLocale {
  const raw = (header ?? '').trim();
  if (!raw) return DEFAULT_LOCALE;

  const entries = raw
    .split(',')
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  for (const entry of entries) {
    const locale = normalizeLocale(entry);
    if (locale !== DEFAULT_LOCALE || entry.toLowerCase().startsWith('en')) {
      return locale;
    }
  }

  return DEFAULT_LOCALE;
}
