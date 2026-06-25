from lyrics_lab.ingestion.load_bow import load_bow_csv
from lyrics_lab.utils.paths import sample_dir


def test_bow_loader_reads_required_columns(prepared_sample_data):
    df = load_bow_csv(sample_dir() / "lyric_bow_features.csv")
    assert {"song_id", "term", "weight", "source"}.issubset(df.columns)
    assert len(df) > 0
