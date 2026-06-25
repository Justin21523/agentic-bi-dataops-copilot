from fastapi.testclient import TestClient

from lyrics_lab.api.main import app
from lyrics_lab.evaluation.safety_checks import assert_no_raw_lyrics
from lyrics_lab.utils.paths import sample_dir


def test_sample_files_do_not_contain_forbidden_lyric_columns(prepared_sample_data):
    forbidden = {"raw_lyrics", "lyrics_text", "full_lyrics", "lyric_lines"}
    for path in sample_dir().glob("*.csv"):
        header = path.read_text(encoding="utf-8").splitlines()[0].split(",")
        assert forbidden.isdisjoint(header), path.name


def test_song_related_api_responses_exclude_forbidden_fields(prepared_sample_data):
    client = TestClient(app)
    search = client.get("/api/v1/songs/search", params={"limit": 1})
    assert search.status_code == 200
    assert_no_raw_lyrics(search.json())
    song_id = search.json()[0]["song_id"]
    for path in [
        f"/api/v1/songs/{song_id}",
        f"/api/v1/songs/{song_id}/similar",
        f"/api/v1/songs/{song_id}/topics",
        f"/api/v1/songs/{song_id}/sentiment",
        "/api/v1/analytics/decade-trends",
        "/api/v1/analytics/genre-sentiment",
        "/api/v1/analytics/language-culture",
        "/api/v1/analytics/artist-style-clusters",
        "/api/v1/analytics/genre-leakage",
        "/api/v1/analytics/filter-options",
        "/api/v1/analytics/highlights",
        "/api/v1/analytics/drilldown/songs",
        "/api/v1/analytics/topics/0/terms",
        f"/api/v1/songs/{song_id}/similar/explanations",
    ]:
        response = client.get(path)
        assert response.status_code == 200
        assert_no_raw_lyrics(response.json())
