import type { Prediction } from "../api";

interface VerdictProps {
  prediction: Prediction;
  nEstimators: number;
}

export function Verdict({ prediction, nEstimators }: VerdictProps) {
  return (
    <div className={`verdict${prediction.isHighRisk ? " high" : ""}`} role="status">
      <p className="badge">{prediction.badge}</p>
      <p className="verdict-line">{prediction.verdict}</p>

      <p className="margin-label">Vote margin</p>
      <p className="margin-value">
        <b>{prediction.confidence}%</b> — {prediction.bandLabel}
      </p>
      {/* aria-hidden: the figure and band name above already state this in text. */}
      <p className="steps" aria-hidden="true">
        {prediction.bandScale.map((filled, index) => (
          <span key={index} className={filled ? "on" : undefined} />
        ))}
      </p>

      <p className="small-print">
        The margin is how strongly the {nEstimators} stumps leaned towards this class, not a
        calibrated probability of disease. Trained on 1,025 public records for a coursework
        project. Not a medical device.
      </p>
    </div>
  );
}
