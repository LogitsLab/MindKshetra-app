import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { dictionary, t as translate, type AppLang, type DictKey } from "@/i18n/dictionary";
import { getStoredLang, setStoredLang } from "@/storage/local";

type LanguageContextValue = {
  lang: AppLang;
  setLang: (lang: AppLang) => void;
  t: (key: DictKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<AppLang>("en");

  useEffect(() => {
    getStoredLang().then((stored) => {
      if (stored) setLangState(stored);
    });
  }, []);

  const setLang = useCallback((next: AppLang) => {
    setLangState(next);
    void setStoredLang(next);
  }, []);

  const t = useCallback((key: DictKey) => translate(lang, key), [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage requires LanguageProvider");
  return ctx;
}

export { dictionary };
