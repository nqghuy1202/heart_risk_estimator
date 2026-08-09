"""Input form for the heart disease predictor.

The 13 fields mirror the UCI Heart Disease feature set, in the same order the model
was trained on (see heart.csv). Value ranges come from the dataset documentation, so
out-of-domain input is rejected before it ever reaches the classifier.
"""

from django import forms


def _range_errors(low, high) -> dict:
    """Replace Django's two one-sided range messages with a single message stating the range.

    "Ensure this value is greater than or equal to 80" makes the reader work out the other
    bound; "Enter a value between 80 and 220" does not.
    """
    message = f"Enter a value between {low} and {high}."
    return {"min_value": message, "max_value": message}


SEX_CHOICES = [
    (1, "Male"),
    (0, "Female"),
]

CHEST_PAIN_CHOICES = [
    (0, "Typical angina"),
    (1, "Atypical angina"),
    (2, "Non-anginal pain"),
    (3, "Asymptomatic"),
]

YES_NO_CHOICES = [
    (0, "No"),
    (1, "Yes"),
]

RESTECG_CHOICES = [
    (0, "Normal"),
    (1, "ST-T wave abnormality"),
    (2, "Probable or definite left ventricular hypertrophy"),
]

SLOPE_CHOICES = [
    (0, "Upsloping"),
    (1, "Flat"),
    (2, "Downsloping"),
]

CA_CHOICES = [(i, str(i)) for i in range(5)]

THAL_CHOICES = [
    (0, "Unknown"),
    (1, "Normal"),
    (2, "Fixed defect"),
    (3, "Reversible defect"),
]

# Feature order expected by the trained model — do not reorder without retraining.
FEATURE_ORDER = [
    "age",
    "sex",
    "cp",
    "trestbps",
    "chol",
    "fbs",
    "restecg",
    "thalach",
    "exang",
    "oldpeak",
    "slope",
    "ca",
    "thal",
]

# Display order, which is deliberately *not* FEATURE_ORDER: the model contract is not a
# presentation concern. Grouping runs easiest-to-hardest, so the fields needing an ECG or a
# stress test come last. The template renders these groups and never names a field itself.
FIELD_GROUPS = [
    ("Patient", ["age", "sex"]),
    ("Vitals and bloodwork", ["trestbps", "chol", "fbs", "thalach"]),
    ("Cardiac assessment", ["cp", "restecg", "exang", "oldpeak", "slope", "ca", "thal"]),
]


class TestForm(forms.Form):
    """Validates and type-coerces the 13 clinical inputs used for prediction."""

    age = forms.IntegerField(
        label="Age (years)",
        min_value=1,
        max_value=120,
        error_messages=_range_errors(1, 120),
    )
    sex = forms.TypedChoiceField(
        label="Sex",
        choices=SEX_CHOICES,
        coerce=int,
    )
    cp = forms.TypedChoiceField(
        label="Chest pain type",
        help_text="Typical angina follows exertion and eases with rest; asymptomatic means no chest pain.",
        choices=CHEST_PAIN_CHOICES,
        coerce=int,
    )
    trestbps = forms.IntegerField(
        label="Resting blood pressure",
        help_text="Systolic pressure on admission, in mm Hg.",
        min_value=80,
        max_value=220,
        error_messages=_range_errors(80, 220),
    )
    chol = forms.IntegerField(
        label="Serum cholesterol (mg/dl)",
        help_text="Total cholesterol from a blood sample.",
        min_value=100,
        max_value=600,
        error_messages=_range_errors(100, 600),
    )
    fbs = forms.TypedChoiceField(
        label="Fasting blood sugar over 120 mg/dl",
        choices=YES_NO_CHOICES,
        coerce=int,
    )
    restecg = forms.TypedChoiceField(
        label="Resting ECG result",
        choices=RESTECG_CHOICES,
        coerce=int,
    )
    thalach = forms.IntegerField(
        label="Maximum heart rate (bpm)",
        help_text="Highest heart rate reached during the exercise test.",
        min_value=60,
        max_value=220,
        error_messages=_range_errors(60, 220),
    )
    exang = forms.TypedChoiceField(
        label="Exercise-induced angina",
        help_text="Whether chest pain appeared during the exercise test.",
        choices=YES_NO_CHOICES,
        coerce=int,
    )
    oldpeak = forms.FloatField(
        label="ST depression (mm)",
        help_text="How far the ST segment dropped during exercise compared with rest.",
        min_value=0.0,
        max_value=7.0,
        error_messages=_range_errors(0, 7),
    )
    slope = forms.TypedChoiceField(
        label="Peak exercise ST slope",
        help_text="Direction the ST segment takes at peak exercise.",
        choices=SLOPE_CHOICES,
        coerce=int,
    )
    ca = forms.TypedChoiceField(
        label="Major vessels on fluoroscopy",
        help_text="How many of the four major vessels took up the dye.",
        choices=CA_CHOICES,
        coerce=int,
    )
    thal = forms.TypedChoiceField(
        label="Thalassemia result",
        help_text="Blood-flow finding from the thallium stress test.",
        choices=THAL_CHOICES,
        coerce=int,
    )

    def as_feature_row(self) -> list[float]:
        """Return the cleaned values as a single model input row, in training order."""
        return [self.cleaned_data[name] for name in FEATURE_ORDER]

    def error_messages_by_field(self) -> dict[str, list[str]]:
        """The validation errors as plain strings, ready for a JSON response."""
        return {name: [str(message) for message in messages] for name, messages in self.errors.items()}


def _describe_field(name: str, field: forms.Field) -> dict:
    """Describe one field well enough for a client to render and pre-validate it.

    Everything a control needs — wording, units, bounds, options — is stated once here,
    on the same object that enforces it, so the browser cannot drift from the server.
    """
    described = {
        "name": name,
        "label": field.label,
        "help": field.help_text or "",
    }
    if isinstance(field, forms.ChoiceField):
        described["kind"] = "choice"
        # Values stay strings: they travel as form values and are coerced back to int
        # by TypedChoiceField on the way in.
        described["choices"] = [{"value": str(value), "label": label} for value, label in field.choices]
    else:
        is_float = isinstance(field, forms.FloatField)
        described.update(
            kind="number",
            min=field.min_value,
            max=field.max_value,
            # oldpeak is the only non-integer measurement.
            step=0.1 if is_float else 1,
            # Numeric keypad on a phone; the decimal point only where it is meaningful.
            inputmode="decimal" if is_float else "numeric",
        )
    return described


def field_schema() -> dict:
    """The full form contract: display groups, and the description of every field.

    Serving this rather than hard-coding it in the client keeps FIELD_GROUPS the single
    place display order is decided, exactly as it was when a Django template rendered it.
    """
    form = TestForm()
    return {
        "groups": [{"title": title, "fields": names} for title, names in FIELD_GROUPS],
        "fields": {name: _describe_field(name, field) for name, field in form.fields.items()},
    }
