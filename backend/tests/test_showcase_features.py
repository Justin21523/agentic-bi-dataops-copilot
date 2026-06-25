from fastapi.testclient import TestClient

from lyrics_lab.api.main import app
from lyrics_lab.evaluation.safety_checks import assert_no_raw_lyrics


def test_topic_quality_and_data_quality_are_safe(prepared_sample_data):
    client = TestClient(app)
    for path in ["/api/v1/analytics/topic-quality", "/api/v1/data-quality/report"]:
        response = client.get(path)
        assert response.status_code == 200
        payload = response.json()
        assert payload
        assert_no_raw_lyrics(payload)


def test_evaluation_contains_baseline_and_good_bad_examples(prepared_sample_data):
    client = TestClient(app)
    response = client.get("/api/v1/models/evaluation")
    assert response.status_code == 200
    payload = response.json()
    assert "majority_baseline_accuracy" in payload
    assert "tfidf_accuracy" in payload
    assert "accuracy_lift" in payload
    assert "good_examples" in payload
    assert "bad_examples" in payload
    assert_no_raw_lyrics(payload)
