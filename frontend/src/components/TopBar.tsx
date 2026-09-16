import { LANGUAGES } from "../i18n/translations";
import { useLanguage } from "../i18n/LanguageContext";
import { Logo } from "./Logo";

const LANGUAGE_NAMES: Record<string, string> = { en: "EN", vi: "VI" };

export function TopBar() {
  const { lang, setLang, t } = useLanguage();

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <span className="mark">
          <Logo size={20} />
          {t.topbarTitle}
        </span>
        <div className="topbar-right">
          <span className="topbar-meta">{t.topbarMeta}</span>
          <div className="lang-switch" role="group" aria-label={t.languageLabel}>
            {LANGUAGES.map((option) => (
              <button
                key={option}
                type="button"
                className={`lang-option${option === lang ? " on" : ""}`}
                aria-pressed={option === lang}
                onClick={() => setLang(option)}
              >
                {LANGUAGE_NAMES[option]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
