export interface ChoiceOption {
  value: string;
  label: string;
}

interface FieldBase {
  name: string;
  label: string;
  help: string;
}

export interface NumberFieldSpec extends FieldBase {
  kind: "number";
  min: number;
  max: number;
  step: number;
  inputmode: "numeric" | "decimal";
}

export interface ChoiceFieldSpec extends FieldBase {
  kind: "choice";
  choices: ChoiceOption[];
}

export type FieldSpec = NumberFieldSpec | ChoiceFieldSpec;

export interface FieldGroupSpec {
  title: string;
  fields: string[];
}

export interface ModelCardEntry {
  label: string;
  value: string;
}

export interface Schema {
  groups: FieldGroupSpec[];
  fields: Record<string, FieldSpec>;
  modelCard: ModelCardEntry[];
  nEstimators: number;
}

export interface Prediction {
  isHighRisk: boolean;
  verdict: string;
  badge: string;
  confidence: number;
  bandLabel: string;
  bandScale: boolean[];
}

export type FieldErrors = Record<string, string[]>;

export class PredictionRejected extends Error {
  readonly fieldErrors: FieldErrors;

  constructor(message: string, fieldErrors: FieldErrors = {}) {
    super(message);
    this.name = "PredictionRejected";
    this.fieldErrors = fieldErrors;
  }
}

function csrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]*)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

export async function fetchSchema(signal?: AbortSignal): Promise<Schema> {
  const response = await fetch("/api/schema/", { headers: { Accept: "application/json" }, signal });
  if (!response.ok) {
    throw new Error(`The form definition could not be loaded (HTTP ${response.status}).`);
  }
  return (await response.json()) as Schema;
}

export async function requestPrediction(values: Record<string, string>): Promise<Prediction> {
  const response = await fetch("/api/predict/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-CSRFToken": csrfToken(),
    },
    body: JSON.stringify(values),
  });

  if (response.ok) {
    const body = (await response.json()) as { result: Prediction };
    return body.result;
  }

  if (response.status === 400) {
    const body = (await response.json()) as { errors?: FieldErrors; detail?: string };
    if (body.errors) {
      throw new PredictionRejected("Some values need correcting.", body.errors);
    }
    throw new PredictionRejected(body.detail ?? "The request was rejected.");
  }

  throw new PredictionRejected(`The prediction could not be run (HTTP ${response.status}).`);
}
