from pathlib import Path

import pandas as pd


def evaluate_topics(sample_path: Path) -> dict[str, float]:
    topics = pd.read_csv(sample_path / "lyric_topics.csv")
    coherence = topics.groupby("topic_label")["topic_score"].mean().mean()
    return {"topic_coherence": round(float(coherence), 3)}
