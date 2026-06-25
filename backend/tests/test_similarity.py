import pandas as pd

from lyrics_lab.models.similarity import compute_similar_songs
from lyrics_lab.utils.paths import sample_dir


def test_similarity_excludes_self(prepared_sample_data):
    bow = pd.read_csv(sample_dir() / "lyric_bow_features.csv")
    similar = compute_similar_songs(bow, top_k=3)
    assert len(similar) > 0
    assert not (similar["song_id"] == similar["similar_song_id"]).any()


def test_trained_similarity_includes_all_methods(prepared_sample_data):
    import pandas as pd

    similar = pd.read_csv(sample_dir() / "similar_songs.csv")
    assert {"tfidf", "topic_vector", "style_embedding"}.issubset(set(similar["method"]))
