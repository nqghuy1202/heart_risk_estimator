import { useLanguage } from "../i18n/LanguageContext";

export function Awaiting() {
  const { t } = useLanguage();
  return (
    <div className="awaiting">
      <p className="awaiting-title">{t.awaitingTitle}</p>
      <p className="awaiting-body">{t.awaitingBody}</p>
      <p className="small-print">{t.awaitingSmallPrint}</p>
    </div>
  );
}
