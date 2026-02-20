import type { AbstractIntlMessages } from "next-intl";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";
import type { AppLocale } from "@/lib/i18n/config";

const catalogs: Record<AppLocale, AbstractIntlMessages> = {
  en,
  ar,
};

export function getLocaleMessages(locale: AppLocale): AbstractIntlMessages {
  return catalogs[locale];
}
