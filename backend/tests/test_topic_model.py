import pandas as pd

from lyrics_lab.models.topic_model import train_topics
from lyrics_lab.utils.paths import sample_dir


def test_topic_model_outputs_labels(prepared_sample_data):
    bow = pd.read_csv(sample_dir() / "lyric_bow_features.csv")
    topics, labels = train_topics(bow, n_topics=4)
    assert len(topics) > 0
    assert topics["topic_label"].str.len().min() > 0
    assert len(labels) == 4
