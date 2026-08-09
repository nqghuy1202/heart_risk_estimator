import type { Prediction, Schema } from "../api";

export const schema: Schema = {
  groups: [
    { title: "Patient", fields: ["age", "sex"] },
    { title: "Vitals and bloodwork", fields: ["trestbps"] },
  ],
  fields: {
    age: {
      name: "age",
      label: "Age (years)",
      help: "",
      kind: "number",
      min: 1,
      max: 120,
      step: 1,
      inputmode: "numeric",
    },
    sex: {
      name: "sex",
      label: "Sex",
      help: "",
      kind: "choice",
      choices: [
        { value: "1", label: "Male" },
        { value: "0", label: "Female" },
      ],
    },
    trestbps: {
      name: "trestbps",
      label: "Resting blood pressure",
      help: "Systolic pressure on admission, in mm Hg.",
      kind: "number",
      min: 80,
      max: 220,
      step: 1,
      inputmode: "numeric",
    },
  },
  modelCard: [
    { label: "Accuracy", value: "87.8%" },
    { label: "Estimators", value: "21" },
  ],
  nEstimators: 21,
};

export const highRisk: Prediction = {
  isHighRisk: true,
  verdict: "Elevated risk of heart disease",
  badge: "Elevated risk",
  confidence: 57.7,
  bandLabel: "weak lean",
  bandScale: [true, true, false, false, false],
};

export const lowRisk: Prediction = {
  isHighRisk: false,
  verdict: "Low risk of heart disease",
  badge: "Low risk",
  confidence: 91.2,
  bandLabel: "decisive lean",
  bandScale: [true, true, true, true, true],
};
