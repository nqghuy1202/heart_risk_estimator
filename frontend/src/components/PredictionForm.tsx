import type { FieldErrors, Schema } from "../api";
import { useLanguage } from "../i18n/LanguageContext";
import { Field } from "./Field";

interface PredictionFormProps {
  schema: Schema;
  values: Record<string, string>;
  errors: FieldErrors;
  pending: boolean;
  onChange: (name: string, value: string) => void;
  onBlur: (name: string) => void;
  onSubmit: () => void;
}

export function PredictionForm({
  schema,
  values,
  errors,
  pending,
  onChange,
  onBlur,
  onSubmit,
}: PredictionFormProps) {
  const { t } = useLanguage();
  const hasErrors = Object.keys(errors).length > 0;

  const fieldNames = schema.groups.flatMap((group) => group.fields);
  const filledCount = fieldNames.filter((name) => (values[name] ?? "").trim() !== "").length;
  const totalCount = fieldNames.length;

  return (
    <form
      method="post"
      id="form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="progress">
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${totalCount === 0 ? 0 : (filledCount / totalCount) * 100}%` }}
          />
        </div>
        <p className="progress-label">{t.progressLabel(filledCount, totalCount)}</p>
      </div>

      {hasErrors && <p className="errors-summary">{t.errorsSummary}</p>}

      {schema.groups.map((group) => (
        <section className="group" key={group.title}>
          <h2 className="group-title">{group.title}</h2>
          <div className="grid">
            {group.fields.map((name) => {
              const spec = schema.fields[name];
              if (!spec) {
                return null;
              }
              return (
                <Field
                  key={name}
                  spec={spec}
                  value={values[name] ?? ""}
                  errors={errors[name] ?? []}
                  onChange={onChange}
                  onBlur={onBlur}
                />
              );
            })}
          </div>
        </section>
      ))}

      <div className="submit-row">
        <button type="submit" className="submit-button" disabled={pending}>
          {pending ? t.submitting : t.submit}
        </button>
        <p className="submit-note">{t.submitNote}</p>
      </div>
    </form>
  );
}
