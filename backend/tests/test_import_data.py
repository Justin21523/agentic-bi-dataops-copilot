from lyrics_lab.ingestion.data_quality import build_quality_report
from lyrics_lab.ingestion.import_data import normalize_aliases
from lyrics_lab.ingestion.generate_sample_data import generate
from lyrics_lab.api.main import app
from fastapi.testclient import TestClient


def test_import_alias_mapping_and_quality_report(tmp_path):
    (tmp_path / "artists.csv").write_text(
        "id_artist,name,country,active_start_year,active_end_year\nartist_x,Artist X,US,2000,\n",
        encoding="utf-8",
    )
    (tmp_path / "songs.csv").write_text(
        "track_id,song,artist,album,release_year,lang,style\nsong_x,Track X,artist_x,Album X,2020,en,pop\n",
        encoding="utf-8",
    )
    (tmp_path / "lyric_bow_features.csv").write_text(
        "track_id,word,tfidf,source\nsong_x,neon,1.5,test\n",
        encoding="utf-8",
    )
    normalize_aliases(tmp_path)
    report = build_quality_report(tmp_path)
    assert report["status"] == "pass"
    assert report["tables"]["songs"]["rows"] == 1


def test_upload_dataset_creates_session_dataset(tmp_path, prepared_sample_data):
    generate(tmp_path, song_count=42)
    client = TestClient(app)
    handles = [(tmp_path / name).open("rb") for name in ["artists.csv", "songs.csv", "lyric_bow_features.csv"]]
    try:
        files = [("files", (path.name, handle, "text/csv")) for path, handle in zip([tmp_path / "artists.csv", tmp_path / "songs.csv", tmp_path / "lyric_bow_features.csv"], handles)]
        response = client.post("/api/v1/datasets/upload", files=files)
    finally:
        for handle in handles:
            handle.close()
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ready"
    assert [step["label"] for step in payload["processing_timeline"]] == ["Validation", "Cleaning", "Feature generation", "Training", "Evaluation"]
    dataset_id = payload["dataset_id"]

    profile = client.get(f"/api/v1/analysis/datasets/{dataset_id}/profile")
    assert profile.status_code == 200
    assert profile.json()["dataset_id"] == dataset_id
    assert profile.json()["row_count"] == 42
