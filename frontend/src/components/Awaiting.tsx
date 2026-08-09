export function Awaiting() {
  return (
    <div className="awaiting">
      <p className="awaiting-title">No prediction yet</p>
      <p className="awaiting-body">
        Fill in the thirteen measurements and select Predict. The risk class and how firmly the
        stumps voted for it appear here.
      </p>
      <p className="small-print">
        Trained on 1,025 public records for a coursework project. Not a medical device, and not
        a substitute for clinical assessment.
      </p>
    </div>
  );
}
