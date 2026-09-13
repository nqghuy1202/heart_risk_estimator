import type { Prediction } from "../api";
import { useLanguage } from "../i18n/LanguageContext";

interface VerdictProps {
  prediction: Prediction;
  nEstimators: number;
}

export function Verdict({ prediction, nEstimators }: VerdictProps) {
  const { t } = useLanguage();
  return (
    <div className={`verdict${prediction.isHighRisk ? " high" : ""}`} role="status">
      <p className="badge">{prediction.badge}</p>
      <p className="verdict-line">{prediction.verdict}</p>

      <p className="margin-label">{t.verdictMarginLabel}</p>
      <p className="margin-value">
        <b>{prediction.confidence}%</b> - {prediction.bandLabel}
      </p>
      {/* aria-hidden: the figure and band name above already state this in text. */}
      <p className="steps" aria-hidden="true">
        {prediction.bandScale.map((filled, index) => (
          <span key={index} className={filled ? "on" : undefined} />
        ))}
      </p>

      <p className="small-print">{t.verdictSmallPrint(nEstimators)}</p>
    </div>
  );
}
