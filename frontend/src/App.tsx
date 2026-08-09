import { useCallback, useEffect, useRef, useState } from "react";

import {
  PredictionRejected,
  fetchSchema,
  requestPrediction,
  type FieldErrors,
  type Prediction,
  type Schema,
} from "./api";
import { Awaiting } from "./components/Awaiting";
import { PredictionForm } from "./components/PredictionForm";
import { TopBar } from "./components/TopBar";
import { Verdict } from "./components/Verdict";

/** Field names in the order they are displayed, which is not the model's feature order. */
function displayOrder(schema: Schema): string[] {
  return schema.groups.flatMap((group) => group.fields);
}

function emptyValues(schema: Schema): Record<string, string> {
  const values: Record<string, string> = {};
  for (const name of displayOrder(schema)) {
    const spec = schema.fields[name];
    values[name] = spec?.kind === "choice" ? (spec.choices[0]?.value ?? "") : "";
  }
  return values;
}

export function App() {
  const [schema, setSchema] = useState<Schema | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [pending, setPending] = useState(false);

  const [rejections, setRejections] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchSchema(controller.signal)
      .then((loaded) => {
        setSchema(loaded);
        setValues(emptyValues(loaded));
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setLoadError(error instanceof Error ? error.message : "The form could not be loaded.");
      });
    return () => controller.abort();
  }, []);

  const handleChange = useCallback((name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!schema) {
      return;
    }
    setPending(true);
    setFormError(null);
    try {
      const result = await requestPrediction(values);
      setPrediction(result);
      setErrors({});
    } catch (error: unknown) {
      setPrediction(null);
      if (error instanceof PredictionRejected) {
        setErrors(error.fieldErrors);
        setFormError(Object.keys(error.fieldErrors).length > 0 ? null : error.message);
      } else {
        setErrors({});
        setFormError("The prediction could not be run. Check that the server is still running.");
      }
      setRejections((count) => count + 1);
    } finally {
      setPending(false);
    }
  }, [schema, values]);

  const firstInvalid = schema ? displayOrder(schema).find((name) => name in errors) : undefined;
  const lastFocused = useRef(0);
  useEffect(() => {
    if (rejections === lastFocused.current || !firstInvalid) {
      return;
    }
    lastFocused.current = rejections;
    document.getElementById(`id_${firstInvalid}`)?.focus();
  }, [rejections, firstInvalid]);

  if (loadError) {
    return (
      <>
        <TopBar />
        <main>
          <p className="status-note failed">{loadError}</p>
        </main>
      </>
    );
  }

  if (!schema) {
    return (
      <>
        <TopBar />
        <main>
          <p className="status-note">Loading the form…</p>
        </main>
      </>
    );
  }

  return (
    <>
      <a className="skip-link" href="#form">
        Skip to the form
      </a>

      <TopBar />

      <main className="wrap">
        {/* The rail comes first in DOM order, so a screen reader reaches the verdict before
            the form it belongs to. */}
        <div className="rail">
          <h1>Risk assessment</h1>
          <p className="intro">
            Fill in thirteen clinical measurements. An AdaBoost classifier returns a risk class
            and how firmly its stumps voted for it.
          </p>

          <dl className="facts">
            {schema.modelCard.map((entry) => (
              <div key={entry.label}>
                <dt>{entry.label}</dt>
                <dd>{entry.value}</dd>
              </div>
            ))}
          </dl>

          {prediction ? (
            <Verdict prediction={prediction} nEstimators={schema.nEstimators} />
          ) : (
            <Awaiting />
          )}
        </div>

        <div className="form-col">
          {formError && <p className="errors-summary">{formError}</p>}

          <PredictionForm
            schema={schema}
            values={values}
            errors={errors}
            pending={pending}
            onChange={handleChange}
            onSubmit={handleSubmit}
          />

          <footer className="notes">
            <p>
              AdaBoost (scikit-learn) trained on the UCI Heart Disease dataset. The number of
              estimators was chosen on the test set rather than a validation split, so the
              accuracy above is mildly optimistic, and the dataset contains duplicated records.
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
