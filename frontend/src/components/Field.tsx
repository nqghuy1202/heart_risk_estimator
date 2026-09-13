import type { ChangeEvent, FocusEvent, KeyboardEvent } from "react";

import type { ChoiceOption, FieldSpec } from "../api";
import { useLanguage } from "../i18n/LanguageContext";

interface FieldProps {
  spec: FieldSpec;
  value: string;
  errors: string[];
  onChange: (name: string, value: string) => void;
  onBlur: (name: string) => void;
}

// Above this many options a row of buttons stops being scannable at a glance, so
// those fall back to a native <select>. Nothing in the current schema hits this.
const MAX_SEGMENTED_OPTIONS = 5;

/** Moves focus (and selection) to the next/previous/first/last option, roving-tabindex style. */
function handleSegmentedKeyDown(
  event: KeyboardEvent<HTMLDivElement>,
  choices: ChoiceOption[],
  value: string,
  onSelect: (choiceValue: string) => void,
) {
  const currentIndex = choices.findIndex((choice) => choice.value === value);
  let nextIndex: number | null = null;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    nextIndex = (currentIndex + 1 + choices.length) % choices.length;
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    nextIndex = (currentIndex - 1 + choices.length) % choices.length;
  } else if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = choices.length - 1;
  }
  if (nextIndex === null) {
    return;
  }
  const nextChoice = choices[nextIndex];
  if (!nextChoice) {
    return;
  }
  event.preventDefault();
  onSelect(nextChoice.value);
  const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("[role='radio']");
  buttons[nextIndex]?.focus();
}

/** The raw model column (e.g. "trestbps") as a quiet hover/focus hint instead of
 * always-on text — useful to someone reading the code, noise to everyone else. */
function ColumnHint({ name }: { name: string }) {
  const { t } = useLanguage();
  return (
    <span className="col-hint" title={t.columnHint(name)}>
      <span aria-hidden="true">i</span>
      <span className="sr-only">{t.columnHint(name)}</span>
    </span>
  );
}

export function Field({ spec, value, errors, onChange, onBlur }: FieldProps) {
  const fieldId = `id_${spec.name}`;
  const labelId = `label_${spec.name}`;
  const helpId = `help_${spec.name}`;
  const errorId = `error_${spec.name}`;
  const hasError = errors.length > 0;

  const describedBy = [spec.help ? helpId : null, hasError ? errorId : null]
    .filter((id): id is string => id !== null)
    .join(" ");

  const useSegmented = spec.kind === "choice" && spec.choices.length <= MAX_SEGMENTED_OPTIONS;

  return (
    <div className={`field${hasError ? " bad" : ""}`}>
      {useSegmented ? (
        <span className="field-label" id={labelId}>
          {spec.label}
          <ColumnHint name={spec.name} />
        </span>
      ) : (
        <label className="field-label" htmlFor={fieldId}>
          {spec.label}
          <ColumnHint name={spec.name} />
        </label>
      )}

      {spec.kind === "choice" && useSegmented && (
        // Buttons the user can compare at a glance, instead of a dropdown they must
        // open to read. One click picks a value; arrow keys move between options.
        <div
          className="segmented"
          role="radiogroup"
          aria-labelledby={labelId}
          aria-describedby={describedBy || undefined}
          onKeyDown={(event) =>
            handleSegmentedKeyDown(event, spec.choices, value, (choiceValue) =>
              onChange(spec.name, choiceValue),
            )
          }
        >
          {spec.choices.map((choice) => {
            const checked = choice.value === value;
            return (
              <button
                key={choice.value}
                type="button"
                role="radio"
                aria-checked={checked}
                tabIndex={checked ? 0 : -1}
                className={`segmented-option${checked ? " on" : ""}`}
                onClick={() => onChange(spec.name, choice.value)}
              >
                {choice.label}
              </button>
            );
          })}
        </div>
      )}

      {spec.kind === "choice" && !useSegmented && (
        <select
          id={fieldId}
          name={spec.name}
          value={value}
          className="select"
          aria-describedby={describedBy || undefined}
          aria-invalid={hasError || undefined}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(spec.name, event.target.value)}
        >
          {spec.choices.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
      )}

      {spec.kind === "number" && (
        // min/max/step mirror the Django field so the browser enforces the same range.
        <input
          id={fieldId}
          name={spec.name}
          value={value}
          className="input"
          type="number"
          min={spec.min}
          max={spec.max}
          step={spec.step}
          inputMode={spec.inputmode}
          aria-describedby={describedBy || undefined}
          aria-invalid={hasError || undefined}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(spec.name, event.target.value)}
          onBlur={(_event: FocusEvent<HTMLInputElement>) => onBlur(spec.name)}
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
