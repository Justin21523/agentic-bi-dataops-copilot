from fastapi.testclient import TestClient

from lyrics_lab.api.main import app
from lyrics_lab.evaluation.safety_checks import assert_no_raw_lyrics


def test_new_analytics_endpoints_return_safe_payloads(prepared_sample_data):
    client = TestClient(app)
    for path in [
        "/api/v1/analytics/decade-trends",
        "/api/v1/analytics/genre-sentiment",
        "/api/v1/analytics/topic-decade",
        "/api/v1/analytics/language-culture",
        "/api/v1/analytics/artist-style-clusters",
        "/api/v1/analytics/genre-leakage",
        "/api/v1/analytics/topics/0/songs",
    ]:
        response = client.get(path)
        assert response.status_code == 200, path
        payload = response.json()
        assert payload, path
        assert_no_raw_lyrics(payload)


def test_artist_search_accepts_region_field(prepared_sample_data):
    client = TestClient(app)
    response = client.get("/api/v1/artists/search", params={"q": "Sample"})
    assert response.status_code == 200
    payload = response.json()
    assert payload
    assert "region" in payload[0]
    assert_no_raw_lyrics(payload)


def test_drilldown_supports_chart_selection_filters(prepared_sample_data):
    client = TestClient(app)
    cases = [
        {"sentiment_label": "positive"},
        {"artist_id": "artist_001"},
        {"genre": "pop", "predicted_genre": "pop"},
    ]
    for params in cases:
        response = client.get("/api/v1/analytics/drilldown/songs", params=params)
        assert response.status_code == 200, params
        payload = response.json()
        assert isinstance(payload, list)
        assert_no_raw_lyrics(payload)
