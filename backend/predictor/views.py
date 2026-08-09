"""Views for the heart disease predictor: the page shell and two JSON endpoints."""

import json
from pathlib import Path

import pandas as pd
from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST
from joblib import load

from predictor.form import FEATURE_ORDER, TestForm, field_schema

# Loaded once at import time, by absolute path so the working directory does not matter.
MODEL_PATH = Path(settings.BASE_DIR) / "adaboost.joblib"
model = load(MODEL_PATH)

POSITIVE_MESSAGE = "Elevated risk of heart disease"
NEGATIVE_MESSAGE = "Low risk of heart disease"

N_ESTIMATORS = 21

# Test-set figures from the training notebook. Update after a retrain.
MODEL_CARD = [
    {"label": "Accuracy", "value": "87.8%"},
    {"label": "Recall", "value": "92.9%"},
    {"label": "Training records", "value": "1,025"},
    {"label": "Estimators", "value": str(N_ESTIMATORS)},
]

# The winning class always holds at least half of a binary vote, so the real range is
# 0.5-1.0. Five named bands over that range, rather than a 0-100% bar.
VOTE_BANDS = [
    (0.55, "marginal lean"),
    (0.65, "weak lean"),
    (0.75, "moderate lean"),
    (0.85, "strong lean"),
    (1.01, "decisive lean"),
]


def describe_vote(confidence: float) -> tuple[str, list[bool]]:
    """Name the strength of the vote and fill that many of five segments."""
    for index, (upper, label) in enumerate(VOTE_BANDS, start=1):
        if confidence < upper:
            return label, [step <= index for step in range(1, len(VOTE_BANDS) + 1)]
    return VOTE_BANDS[-1][1], [True] * len(VOTE_BANDS)


def _feature_frame(features: dict) -> pd.DataFrame:
    # Named DataFrame, not a bare list: the model was fitted with feature names.
    return pd.DataFrame([[features[name] for name in FEATURE_ORDER]], columns=FEATURE_ORDER)


def predict_heart_disease(features: dict) -> int:
    """Predict from validated features. Returns 1 (disease) or 0 (no disease)."""
    return int(model.predict(_feature_frame(features))[0])


def predict_with_confidence(features: dict) -> tuple[int, float]:
    """Predict, and report the probability mass on the chosen class.

    AdaBoost derives this from a weighted vote of the stumps, so it is relative
    confidence rather than a calibrated likelihood.
    """
    frame = _feature_frame(features)
    label = int(model.predict(frame)[0])
    probabilities = model.predict_proba(frame)[0]
    confidence = float(probabilities[list(model.classes_).index(label)])
    return label, confidence


def describe_prediction(features: dict) -> dict:
    """Run the model and phrase the outcome in the shape the client renders."""
    prediction, confidence = predict_with_confidence(features)
    band_label, band_scale = describe_vote(confidence)
    # camelCase: the only consumer is the TypeScript client.
    return {
        "isHighRisk": prediction == 1,
        "verdict": POSITIVE_MESSAGE if prediction == 1 else NEGATIVE_MESSAGE,
        "badge": "Elevated risk" if prediction == 1 else "Low risk",
        "confidence": round(confidence * 100, 1),
        "bandLabel": band_label,
        "bandScale": band_scale,
    }


@ensure_csrf_cookie
def predictor(request):
    """Serve the single-page shell.

    `ensure_csrf_cookie` sets the cookie the bundle echoes back as `X-CSRFToken`, which
    keeps `/api/predict/` CSRF-protected instead of exempt.
    """
    return render(request, "index.html")


@require_GET
def api_schema(request):
    """The form contract and the model card: everything needed to draw the page."""
    return JsonResponse({**field_schema(), "modelCard": MODEL_CARD, "nEstimators": N_ESTIMATORS})


@require_POST
def api_predict(request):
    """Validate a JSON body of the 13 features and return the phrased outcome.

    Invalid input returns 400 with per-field messages keyed by field name.
    """
    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"detail": "Expected a JSON request body."}, status=400)
    if not isinstance(payload, dict):
        return JsonResponse({"detail": "Expected a JSON object of the 13 features."}, status=400)

    form = TestForm(payload)
    if not form.is_valid():
        return JsonResponse({"errors": form.error_messages_by_field()}, status=400)
    return JsonResponse({"result": describe_prediction(form.cleaned_data)})
