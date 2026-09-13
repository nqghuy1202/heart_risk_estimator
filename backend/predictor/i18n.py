"""Vietnamese/English text for everything the API sends the client: field labels,
help text, choice options, group titles, the model card, and prediction wording.

Field declarations in form.py stay English-only; this module overlays a translation
onto a form's fields (or a piece of served text) after the fact, so validation logic
and the model itself never have to know a second language exists.
"""

from django import forms

LANGUAGES = ("en", "vi")
DEFAULT_LANGUAGE = "en"


def resolve_lang(raw: str | None) -> str:
    """A requested language code, or the default if it is missing or unsupported."""
    return raw if raw in LANGUAGES else DEFAULT_LANGUAGE


def text_for(table: dict, key: str, lang: str, default: str) -> str:
    """`table[key][lang]`, falling back to `default` (English) when either is absent."""
    return table.get(key, {}).get(lang, default)


# name -> {lang: (label, help_text)}
FIELD_TEXT = {
    "age": {"vi": ("Tuổi", "")},
    "sex": {"vi": ("Giới tính", "")},
    "cp": {
        "vi": (
            "Loại đau ngực",
            "Đau thắt ngực điển hình xảy ra khi gắng sức và giảm khi nghỉ; không triệu chứng "
            "nghĩa là không có cơn đau ngực.",
        )
    },
    "trestbps": {"vi": ("Huyết áp lúc nghỉ", "Huyết áp tâm thu lúc nhập viện, tính bằng mm Hg.")},
    "chol": {"vi": ("Cholesterol huyết thanh (mg/dl)", "Tổng cholesterol đo từ mẫu máu.")},
    "fbs": {"vi": ("Đường huyết lúc đói trên 120 mg/dl", "")},
    "restecg": {"vi": ("Kết quả điện tâm đồ lúc nghỉ", "")},
    "thalach": {
        "vi": ("Nhịp tim tối đa (bpm)", "Nhịp tim cao nhất đạt được trong bài kiểm tra gắng sức.")
    },
    "exang": {
        "vi": ("Đau thắt ngực do gắng sức", "Có xuất hiện đau ngực trong bài kiểm tra gắng sức hay không.")
    },
    "oldpeak": {
        "vi": ("ST chênh xuống (mm)", "Mức đoạn ST tụt xuống khi gắng sức so với lúc nghỉ.")
    },
    "slope": {
        "vi": (
            "Độ dốc đoạn ST lúc gắng sức đỉnh điểm",
            "Hướng của đoạn ST tại thời điểm gắng sức đỉnh điểm.",
        )
    },
    "ca": {
        "vi": (
            "Số mạch máu chính trên hình chụp huỳnh quang",
            "Số mạch, trong bốn mạch máu chính, bắt màu thuốc cản quang.",
        )
    },
    "thal": {
        "vi": ("Kết quả thalassemia", "Kết quả lưu lượng máu từ nghiệm pháp gắng sức với thallium.")
    },
}

# name -> {lang: {choice value (as str): label}}
CHOICE_TEXT = {
    "sex": {"vi": {"1": "Nam", "0": "Nữ"}},
    "cp": {
        "vi": {
            "0": "Đau thắt ngực điển hình",
            "1": "Đau thắt ngực không điển hình",
            "2": "Đau ngực không do tim",
            "3": "Không triệu chứng",
        }
    },
    "fbs": {"vi": {"0": "Không", "1": "Có"}},
    "exang": {"vi": {"0": "Không", "1": "Có"}},
    "restecg": {
        "vi": {
            "0": "Bình thường",
            "1": "Bất thường sóng ST-T",
            "2": "Phì đại thất trái có khả năng hoặc rõ ràng",
        }
    },
    "slope": {"vi": {"0": "Dốc lên", "1": "Bằng phẳng", "2": "Dốc xuống"}},
    "thal": {
        "vi": {
            "0": "Không rõ",
            "1": "Bình thường",
            "2": "Khiếm khuyết cố định",
            "3": "Khiếm khuyết có thể hồi phục",
        }
    },
}

GROUP_TITLES = {
    "Patient": {"vi": "Bệnh nhân"},
    "Vitals and bloodwork": {"vi": "Sinh hiệu và xét nghiệm máu"},
    "Cardiac assessment": {"vi": "Đánh giá tim mạch"},
}

MODEL_CARD_LABELS = {
    "Accuracy": {"vi": "Độ chính xác"},
    "Recall": {"vi": "Độ nhạy"},
    "Training records": {"vi": "Số bản ghi huấn luyện"},
    "Estimators": {"vi": "Số bộ ước lượng"},
}

VOTE_BAND_LABELS = {
    "marginal lean": {"vi": "nghiêng nhẹ"},
    "weak lean": {"vi": "nghiêng yếu"},
    "moderate lean": {"vi": "nghiêng vừa"},
    "strong lean": {"vi": "nghiêng mạnh"},
    "decisive lean": {"vi": "nghiêng quyết định"},
}

MISC = {
    "positive_verdict": {"vi": "Nguy cơ mắc bệnh tim cao"},
    "negative_verdict": {"vi": "Nguy cơ mắc bệnh tim thấp"},
    "badge_high": {"vi": "Nguy cơ cao"},
    "badge_low": {"vi": "Nguy cơ thấp"},
}

REQUIRED_ERROR = {"vi": "Trường này là bắt buộc."}
INVALID_INT_ERROR = {"vi": "Nhập một số nguyên."}
INVALID_FLOAT_ERROR = {"vi": "Nhập một số."}
INVALID_CHOICE_ERROR = {"vi": "Chọn một giá trị hợp lệ."}
RANGE_ERROR = {"vi": "Nhập giá trị từ {low} đến {high}."}


def localize_form(form: forms.Form, lang: str) -> None:
    """Overlay `lang` onto a form's fields in place: label, help text, choice labels,
    and error messages. A no-op for the default language, since the fields already
    carry their English text. Field *values* (numeric bounds, choice keys) are
    untouched, so this never changes what the form accepts.
    """
    if lang == DEFAULT_LANGUAGE:
        return

    for name, field in form.fields.items():
        label, help_text = FIELD_TEXT.get(name, {}).get(lang, (None, None))
        if label is not None:
            field.label = label
        if help_text is not None:
            field.help_text = help_text

        choice_labels = CHOICE_TEXT.get(name, {}).get(lang)
        if choice_labels and isinstance(field, forms.ChoiceField):
            field.choices = [
                (value, choice_labels.get(str(value), fallback)) for value, fallback in field.choices
            ]

        if "required" in field.error_messages:
            field.error_messages["required"] = REQUIRED_ERROR[lang]
        if isinstance(field, forms.FloatField):
            field.error_messages["invalid"] = INVALID_FLOAT_ERROR[lang]
        elif isinstance(field, forms.IntegerField):
            field.error_messages["invalid"] = INVALID_INT_ERROR[lang]
        if isinstance(field, forms.ChoiceField):
            field.error_messages["invalid_choice"] = INVALID_CHOICE_ERROR[lang]
        if getattr(field, "min_value", None) is not None and getattr(field, "max_value", None) is not None:
            message = RANGE_ERROR[lang].format(low=field.min_value, high=field.max_value)
            field.error_messages["min_value"] = message
            field.error_messages["max_value"] = message


def localize_group_title(title: str, lang: str) -> str:
    return text_for(GROUP_TITLES, title, lang, title)


def localize_model_card(entries: list[dict], lang: str) -> list[dict]:
    return [
        {"label": text_for(MODEL_CARD_LABELS, entry["label"], lang, entry["label"]), "value": entry["value"]}
        for entry in entries
    ]


def localize_band_label(band_label: str, lang: str) -> str:
    return text_for(VOTE_BAND_LABELS, band_label, lang, band_label)
