import * as shared from "@/i18n/namespaces/shared";
import * as gita from "@/i18n/namespaces/gita";
import * as account from "@/i18n/namespaces/account";
import * as chat from "@/i18n/namespaces/chat";
import * as onboarding from "@/i18n/namespaces/onboarding";
import * as sadhana from "@/i18n/namespaces/sadhana";
import * as meditation from "@/i18n/namespaces/meditation";
import * as community from "@/i18n/namespaces/community";

export type AppLang = "en" | "hi";

export const dictionary = {
  en: {
    ...shared.en,
    ...gita.en,
    ...account.en,
    ...chat.en,
    ...onboarding.en,
    ...sadhana.en,
    ...meditation.en,
    ...community.en,
    navHome: "Home",
  },
  hi: {
    ...shared.hi,
    ...gita.hi,
    ...account.hi,
    ...chat.hi,
    ...onboarding.hi,
    ...sadhana.hi,
    ...meditation.hi,
    ...community.hi,
    navHome: "होम",
  },
} as const;

export type DictKey = keyof typeof dictionary.en;

export function t(lang: AppLang, key: DictKey): string {
  return dictionary[lang][key] ?? dictionary.en[key];
}
