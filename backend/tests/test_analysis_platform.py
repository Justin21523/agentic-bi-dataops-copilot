from fastapi.testclient import TestClient

from lyrics_lab.api.main import app
from lyrics_lab.evaluation.safety_checks import assert_no_raw_lyrics


def test_demo_dataset_profile_and_cleaning_preview_are_safe(prepared_sample_data):
    client = TestClient(app)
    profile = client.get("/api/v1/analysis/datasets/demo/profile")
    assert profile.status_code == 200
    assert profile.json()["row_count"] > 0
    assert profile.json()["columns"]
    assert_no_raw_lyrics(profile.json())

    preview = client.post("/api/v1/analysis/datasets/demo/cleaning-preview")
    assert preview.status_code == 200
    assert "recommended_actions" in preview.json()
    assert_no_raw_lyrics(preview.json())


def test_demo_ml_analysis_endpoints_return_visualization_payloads(prepared_sample_data):
    client = TestClient(app)
    for path in [
        "/api/v1/analysis/datasets/demo/models/classification",
        "/api/v1/analysis/datasets/demo/models/clustering",
        "/api/v1/analysis/datasets/demo/text/tfidf",
        "/api/v1/analysis/datasets/demo/text/topics",
    ]:
        response = client.post(path)
        assert response.status_code == 200, path
        payload = response.json()
        assert payload["dataset_id"] == "demo"
        if path.endswith("/models/clustering"):
            profile = payload["methods"][0]["cluster_profiles"][0]
            assert "representative_songs" in profile
            assert "top_terms" in profile
            assert "topic_mix" in profile
        assert_no_raw_lyrics(payload)


def test_classification_payload_includes_leakage_audit_and_tree_graph(prepared_sample_data):
    client = TestClient(app)
    response = client.post("/api/v1/analysis/datasets/demo/models/classification")
    assert response.status_code == 200
    payload = response.json()
    assert payload["leakage_audit"]["status"] == "pass"
    assert payload["leakage_audit"]["vectorizer_fit_scope"] == "train_split_only"
    assert payload["leakage_audit"]["overlap_count"] == 0
    assert payload["decision_tree"]["nodes"]
    assert "class_labels" in payload["decision_tree"]["nodes"][0]
    assert "sample_ratio" in payload["decision_tree"]["nodes"][0]
    assert "edges" in payload["decision_tree"]
    assert payload["random_forest"]["sample_trees"]
    assert_no_raw_lyrics(payload)


def test_similarity_graph_and_prediction_explanation_are_safe(prepared_sample_data):
    client = TestClient(app)
    options = client.get("/api/v1/songs/options")
    assert options.status_code == 200
    song_id = options.json()[0]["song_id"]
    graph = client.get(f"/api/v1/songs/{song_id}/similar/graph", params={"method": "tfidf"})
    assert graph.status_code == 200
    assert graph.json()["nodes"]
    assert graph.json()["edges"]
    assert_no_raw_lyrics(graph.json())

    prediction = client.post("/api/v1/models/genre-classifier/explain", json={"features": {"dance": 0.8, "light": 0.7, "pulse": 0.3}})
    assert prediction.status_code == 200
    assert prediction.json()["mode"] == "demo_inference"
    assert prediction.json()["scores"]
    assert_no_raw_lyrics(prediction.json())


def test_story_explainability_lineage_and_report_payloads_are_safe(prepared_sample_data):
    client = TestClient(app)
    stories = client.get("/api/v1/analysis/datasets/demo/stories", params={"scope": "overview"})
    assert stories.status_code == 200
    assert 5 <= len(stories.json()["insights"]) <= 8
    assert stories.json()["insights"][0]["evidence"]
    assert_no_raw_lyrics(stories.json())

    explainability = client.get("/api/v1/analysis/datasets/demo/explainability")
    assert explainability.status_code == 200
    assert explainability.json()["feature_comparison"]
    assert explainability.json()["per_class"]
    assert explainability.json()["model_disagreement"]
    assert explainability.json()["leakage_audit"]["overlap_count"] == 0
    assert_no_raw_lyrics(explainability.json())

    lineage = client.get("/api/v1/analysis/datasets/demo/lineage")
    assert lineage.status_code == 200
    assert len(lineage.json()["steps"]) == 8
    assert lineage.json()["selected_song"]["song_id"]
    assert_no_raw_lyrics(lineage.json())

    report = client.post("/api/v1/analysis/datasets/demo/reports", json={"mode": "executive", "selected_insight_ids": [], "selected_chart_ids": []})
    assert report.status_code == 200
    assert "Dataset Summary" in report.json()["markdown"]
    assert "html" in report.json()
    assert_no_raw_lyrics(report.json())
