import { getRequestConfig } from "next-intl/server";
import { getLocaleMessages } from "@/lib/i18n/messages";
import { getRequestLocale } from "@/lib/i18n/server";

export default getRequestConfig(async () => {
  const locale = await getRequestLocale();

  return {
    locale,
    messages: getLocaleMessages(locale),
  };
});
