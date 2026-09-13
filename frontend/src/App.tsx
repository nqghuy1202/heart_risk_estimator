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
import { useLanguage } from "./i18n/LanguageContext";
import { validateField } from "./validation";

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
  const { lang, t } = useLanguage();
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
    fetchSchema(lang, controller.signal)
      .then((loaded) => {
        setSchema(loaded);
        // Re-fetched on a language switch too: keep whatever the user already typed
        // rather than wiping the form, and only seed defaults on the very first load.
        setValues((current) => (Object.keys(current).length === 0 ? emptyValues(loaded) : current));
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setLoadError(error instanceof Error ? error.message : t.schemaLoadError);
      });
    return () => controller.abort();
  }, [lang, t.schemaLoadError]);

  const handleChange = useCallback((name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    // Editing a flagged field clears its message immediately, rather than leaving a
    // stale error on screen until the next blur or submit re-checks it.
    setErrors((current) => {
      if (!(name in current)) {
        return current;
      }
      const next = { ...current };
      delete next[name];
      return next;
    });
  }, []);

  const handleBlur = useCallback(
    (name: string) => {
      const spec = schema?.fields[name];
      if (!spec) {
        return;
      }
      const messages = validateField(spec, values[name] ?? "", t);
      setErrors((current) => {
        if (messages.length === 0) {
          return current;
        }
        return { ...current, [name]: messages };
      });
    },
    [schema, values, t],
  );

  const handleSubmit = useCallback(async () => {
    if (!schema) {
      return;
    }
    setPending(true);
    setFormError(null);
    try {
      const result = await requestPrediction(values, lang);
      setPrediction(result);
      setErrors({});
    } catch (error: unknown) {
      setPrediction(null);
      if (error instanceof PredictionRejected) {
        setErrors(error.fieldErrors);
        setFormError(Object.keys(error.fieldErrors).length > 0 ? null : error.message);
      } else {
        setErrors({});
        setFormError(t.submitError);
      }
      setRejections((count) => count + 1);
    } finally {
      setPending(false);
    }
  }, [schema, values, lang, t]);

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
          <p className="status-note">{t.loading}</p>
        </main>
      </>
    );
  }

  return (
    <>
      <a className="skip-link" href="#form">
        {t.skipLink}
      </a>

      <TopBar />

      <main className="wrap">
        {/* Rail first in DOM order, so a screen reader reaches the verdict before the form. */}
        <div className="rail">
          <h1>{t.heading}</h1>
          <p className="intro">{t.intro}</p>

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
            onBlur={handleBlur}
            onSubmit={handleSubmit}
          />

          <footer className="notes">
            <p>{t.footerNote}</p>
          </footer>
        </div>
      </main>
    </>
  );
}
