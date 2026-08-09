import type { FieldErrors, Schema } from "../api";
import { Field } from "./Field";

interface PredictionFormProps {
  schema: Schema;
  values: Record<string, string>;
  errors: FieldErrors;
  pending: boolean;
  onChange: (name: string, value: string) => void;
  onSubmit: () => void;
}

export function PredictionForm({
  schema,
  values,
  errors,
  pending,
  onChange,
  onSubmit,
}: PredictionFormProps) {
  const hasErrors = Object.keys(errors).length > 0;

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
      {hasErrors && (
        <p className="errors-summary">
          Some values need correcting. The affected fields are marked below.
        </p>
      )}

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
                />
              );
            })}
          </div>
        </section>
      ))}

      <div className="submit-row">
        <button type="submit" className="submit-button" disabled={pending}>
          {pending ? "Predicting..." : "Predict"}
        </button>
        <p className="submit-note">
          Nothing is stored. The values are used for this prediction only.
        </p>
      </div>
    </form>
  );
}
