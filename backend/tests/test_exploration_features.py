from fastapi.testclient import TestClient

from lyrics_lab.api.main import app
from lyrics_lab.evaluation.safety_checks import assert_no_raw_lyrics


def test_filter_options_highlights_and_drilldown_are_safe(prepared_sample_data):
    client = TestClient(app)
    for path in [
        "/api/v1/analytics/filter-options",
        "/api/v1/analytics/highlights",
        "/api/v1/analytics/drilldown/songs?genre=pop&limit=5",
        "/api/v1/analytics/topics/0/terms",
    ]:
        response = client.get(path)
        assert response.status_code == 200, path
        assert_no_raw_lyrics(response.json())


def test_similarity_explanations_are_safe(prepared_sample_data):
    client = TestClient(app)
    song = client.get("/api/v1/songs/search", params={"q": "Track", "limit": 1}).json()[0]
    response = client.get(f"/api/v1/songs/{song['song_id']}/similar/explanations", params={"method": "tfidf"})
    assert response.status_code == 200
    payload = response.json()
    assert payload
    assert {"shared_terms", "shared_topics", "genre_match"}.issubset(payload[0])
    assert_no_raw_lyrics(payload)


def test_export_csv_safe(prepared_sample_data):
    client = TestClient(app)
    response = client.get("/api/v1/export/songs.csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "raw_lyrics" not in response.text
    assert "lyrics_text" not in response.text
