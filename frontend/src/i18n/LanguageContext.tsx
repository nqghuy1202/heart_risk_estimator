import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { LANGUAGES, TRANSLATIONS, type Lang, type Translations } from "./translations";

const STORAGE_KEY = "heart-risk-estimator:lang";

function isLang(value: string | null): value is Lang {
  return value !== null && (LANGUAGES as string[]).includes(value);
}

/** The user's saved choice, else a Vietnamese browser's preference, else English. */
function detectInitialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLang(stored)) {
      return stored;
    }
  } catch {
    // localStorage can throw (private browsing, disabled site data); fall through.
  }
  return navigator.language.toLowerCase().startsWith("vi") ? "vi" : "en";
}

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Best-effort only; the choice just won't survive a reload.
    }
  };

  const value = useMemo<LanguageContextValue>(() => ({ lang, setLang, t: TRANSLATIONS[lang] }), [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
