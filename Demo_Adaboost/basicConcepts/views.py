"""Views serving the heart disease predictor.

Three routes: a shell that hands the built React bundle to the browser, and two JSON
endpoints it calls. The clinical inputs are sensitive, so a prediction is always a POST
body and never a query string.

`TestForm` remains the only validation layer. The API binds it to the decoded JSON exactly
as the template version bound it to `request.POST`, so nothing unvalidated reaches the model
and the browser and the server can never disagree about what a legal value is.
"""

import json
from pathlib import Path

import pandas as pd
from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST
from joblib import load

from basicConcepts.form import FEATURE_ORDER, TestForm, field_schema

# Loaded once at import time, via an absolute path so the app works from any
# working directory (including inside a container).
MODEL_PATH = Path(settings.BASE_DIR) / "adaboost.joblib"
model = load(MODEL_PATH)

POSITIVE_MESSAGE = "Elevated risk of heart disease"
NEGATIVE_MESSAGE = "Low risk of heart disease"

N_ESTIMATORS = 21

# The model card shown in the rail. These are the notebook's own figures, kept next to the
# model they describe rather than in the client, so there is one place to correct after a
# retrain. See CLAUDE.md — the upgrade plan's tables disagree and are wrong.
MODEL_CARD = [
    {"label": "Accuracy", "value": "87.8%"},
    {"label": "Recall", "value": "92.9%"},
    {"label": "Training records", "value": "1,025"},
    {"label": "Estimators", "value": str(N_ESTIMATORS)},
]

# How far the weighted vote leaned towards the class the model chose. In a binary problem
# the winning class always holds at least half the vote, so the useful range is 0.5–1.0 and
# a 0–100% bar would spend half its length on values that can never occur. Five named bands
# over that real range say the same thing without implying a calibrated probability.
VOTE_BANDS = [
    (0.55, "marginal lean"),
    (0.65, "weak lean"),
    (0.75, "moderate lean"),
    (0.85, "strong lean"),
    (1.01, "decisive lean"),
]


def describe_vote(confidence: float) -> tuple[str, list[bool]]:
    """Name the strength of the vote, and fill that many of five segments."""
    for index, (upper, label) in enumerate(VOTE_BANDS, start=1):
        if confidence < upper:
            return label, [step <= index for step in range(1, len(VOTE_BANDS) + 1)]
    return VOTE_BANDS[-1][1], [True] * len(VOTE_BANDS)


def _feature_frame(features: dict) -> pd.DataFrame:
    # A named DataFrame rather than a bare list: the model was fitted with feature
    # names, so this both silences sklearn's warning and pins the column order.
    return pd.DataFrame([[features[name] for name in FEATURE_ORDER]], columns=FEATURE_ORDER)


def predict_heart_disease(features: dict) -> int:
    """Predict from validated features. Returns 1 (disease) or 0 (no disease)."""
    return int(model.predict(_feature_frame(features))[0])


def predict_with_confidence(features: dict) -> tuple[int, float]:
    """Predict, and report how much probability mass the model put on the class it chose.

    AdaBoost's probabilities come from a weighted vote of the stumps rather than from a
    calibrated model, so this reads as relative confidence, not as a true likelihood.
    """
    frame = _feature_frame(features)
    label = int(model.predict(frame)[0])
    probabilities = model.predict_proba(frame)[0]
    confidence = float(probabilities[list(model.classes_).index(label)])
    return label, confidence


def describe_prediction(features: dict) -> dict:
    """Run the model and phrase the outcome, in the shape the client renders."""
    prediction, confidence = predict_with_confidence(features)
    band_label, band_scale = describe_vote(confidence)
    # camelCase because the only consumer is the TypeScript client; the JSON boundary is
    # the one place this project speaks another language's conventions.
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

    `ensure_csrf_cookie` is what makes the API reachable: the bundle reads the `csrftoken`
    cookie and echoes it back as `X-CSRFToken`, so POSTs stay CSRF-protected without the
    endpoint being exempted.
    """
    return render(request, "index.html")


@require_GET
def api_schema(request):
    """The form contract and the model card — everything needed to draw the page once."""
    return JsonResponse({**field_schema(), "modelCard": MODEL_CARD, "nEstimators": N_ESTIMATORS})


@require_POST
def api_predict(request):
    """Validate a JSON body of the 13 features and return the phrased outcome.

    Invalid input comes back as 400 with per-field messages keyed by field name, which is
    the same information Django put under each input when the page was server-rendered.
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
