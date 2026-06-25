import pandas as pd

from lyrics_lab.models.sentiment_model import score_bow_sentiment
from lyrics_lab.utils.paths import sample_dir


def test_sentiment_scores_are_bounded(prepared_sample_data):
    bow = pd.read_csv(sample_dir() / "lyric_bow_features.csv")
    scores = score_bow_sentiment(bow)
    assert scores["sentiment_score"].between(-1, 1).all()
    assert set(scores["sentiment_label"]).issubset({"positive", "neutral", "negative"})
