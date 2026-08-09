import type { ChangeEvent } from "react";

import type { FieldSpec } from "../api";

interface FieldProps {
  spec: FieldSpec;
  value: string;
  errors: string[];
  onChange: (name: string, value: string) => void;
}

export function Field({ spec, value, errors, onChange }: FieldProps) {
  const fieldId = `id_${spec.name}`;
  const helpId = `help_${spec.name}`;
  const errorId = `error_${spec.name}`;
  const hasError = errors.length > 0;

  const describedBy = [spec.help ? helpId : null, hasError ? errorId : null]
    .filter((id): id is string => id !== null)
    .join(" ");

  const shared = {
    id: fieldId,
    name: spec.name,
    value,
    "aria-describedby": describedBy || undefined,
    "aria-invalid": hasError || undefined,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange(spec.name, event.target.value),
  };

  return (
    <div className={`field${hasError ? " bad" : ""}`}>
      <label htmlFor={fieldId}>
        {spec.label}
        <span className="col-name">{spec.name}</span>
      </label>

      {spec.kind === "choice" ? (
        // Native <select>, restyled only at the caret.
        <select {...shared} className="select">
          {spec.choices.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
      ) : (
        // min/max/step mirror the Django field so the browser enforces the same range.
        <input
          {...shared}
          className="input"
          type="number"
          min={spec.min}
          max={spec.max}
          step={spec.step}
          inputMode={spec.inputmode}
        />
      )}

      {spec.help && (
        <p className="help" id={helpId}>
          {spec.help}
        </p>
      )}
      {hasError && (
        <p className="error" id={errorId}>
          {errors[0]}
        </p>
      )}
    </div>
  );
}
