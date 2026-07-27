import * as shared from "@/i18n/namespaces/shared";
import * as gita from "@/i18n/namespaces/gita";
import * as astrology from "@/i18n/namespaces/astrology";
import * as account from "@/i18n/namespaces/account";
import * as chat from "@/i18n/namespaces/chat";

export type AppLang = "en" | "hi";

export const dictionary = {
  en: {
    ...shared.en,
    ...gita.en,
    ...astrology.en,
    ...account.en,
    ...chat.en,
    navHome: "Home",
  },
  hi: {
    ...shared.hi,
    ...gita.hi,
    ...astrology.hi,
    ...account.hi,
    ...chat.hi,
    navHome: "होम",
  },
} as const;

export type DictKey = keyof typeof dictionary.en;

export function t(lang: AppLang, key: DictKey): string {
  return dictionary[lang][key] ?? dictionary.en[key];
}
