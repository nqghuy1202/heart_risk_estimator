import json

from django.test import TestCase

VALID_PAYLOAD = {
    "age": 58,
    "sex": 1,
    "cp": 0,
    "trestbps": 130,
    "chol": 250,
    "fbs": 0,
    "restecg": 0,
    "thalach": 150,
    "exang": 0,
    "oldpeak": 1.0,
    "slope": 1,
    "ca": 0,
    "thal": 2,
}


class SchemaLanguageTests(TestCase):
    def test_defaults_to_english(self):
        response = self.client.get("/api/schema/")
        body = response.json()
        self.assertEqual(body["fields"]["sex"]["label"], "Sex")
        self.assertEqual(body["groups"][0]["title"], "Patient")

    def test_serves_vietnamese_labels_and_choices(self):
        response = self.client.get("/api/schema/?lang=vi")
        body = response.json()
        self.assertEqual(body["fields"]["sex"]["label"], "Giới tính")
        self.assertEqual(body["groups"][0]["title"], "Bệnh nhân")
        choice_labels = {choice["value"]: choice["label"] for choice in body["fields"]["sex"]["choices"]}
        self.assertEqual(choice_labels, {"1": "Nam", "0": "Nữ"})
        # Choice values, which the client posts back, do not change with language.
        self.assertEqual({c["value"] for c in body["fields"]["cp"]["choices"]}, {"0", "1", "2", "3"})

    def test_translates_the_model_card_labels_but_not_the_values(self):
        response = self.client.get("/api/schema/?lang=vi")
        card = {entry["label"]: entry["value"] for entry in response.json()["modelCard"]}
        self.assertEqual(card["Độ chính xác"], "87.8%")

    def test_an_unrecognized_language_falls_back_to_english(self):
        response = self.client.get("/api/schema/?lang=fr")
        self.assertEqual(response.json()["fields"]["sex"]["label"], "Sex")


class PredictLanguageTests(TestCase):
    def test_validation_errors_are_translated(self):
        payload = {**VALID_PAYLOAD, "age": 999}
        response = self.client.post(
            "/api/predict/?lang=vi", data=json.dumps(payload), content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["errors"]["age"], ["Nhập giá trị từ 1 đến 120."])

    def test_validation_errors_default_to_english(self):
        payload = {**VALID_PAYLOAD, "age": 999}
        response = self.client.post("/api/predict/", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["errors"]["age"], ["Enter a value between 1 and 120."])

    def test_prediction_wording_is_translated(self):
        response = self.client.post(
            "/api/predict/?lang=vi", data=json.dumps(VALID_PAYLOAD), content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        result = response.json()["result"]
        self.assertIn(result["verdict"], ("Nguy cơ mắc bệnh tim cao", "Nguy cơ mắc bệnh tim thấp"))
        self.assertIn(result["badge"], ("Nguy cơ cao", "Nguy cơ thấp"))
