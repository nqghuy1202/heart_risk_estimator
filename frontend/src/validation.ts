import type { FieldSpec } from "./api";
import type { Translations } from "./i18n/translations";

/**
 * Client-side mirror of the *checkable-without-a-round-trip* subset of the Django
 * form's validation (required + numeric range). Used to flag a field as soon as the
 * user leaves it, ahead of the authoritative check the server still runs on submit.
 */
export function validateField(spec: FieldSpec, rawValue: string, t: Translations): string[] {
  const value = rawValue.trim();
  if (value === "") {
    return [t.requiredError];
  }
  if (spec.kind !== "number") {
    // Choice fields are populated from a fixed, pre-validated list of values.
    return [];
  }
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return [t.numberError];
  }
  if (numeric < spec.min || numeric > spec.max) {
    return [t.rangeError(spec.min, spec.max)];
  }
  return [];
}
