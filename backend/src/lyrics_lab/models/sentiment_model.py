from __future__ import annotations

import pandas as pd

POSITIVE = {"light", "dream", "dance", "rise", "home", "bright", "power"}
NEGATIVE = {"storm", "break", "memory", "fire"}


def score_bow_sentiment(bow: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for song_id, group in bow.groupby("song_id"):
        pos = group[group["term"].isin(POSITIVE)]["weight"].sum()
        neg = group[group["term"].isin(NEGATIVE)]["weight"].sum()
        score = float((pos - neg) / max(1.0, pos + neg))
        label = "positive" if score > 0.2 else "negative" if score < -0.2 else "neutral"
        rows.append({"song_id": song_id, "sentiment_score": round(score, 3), "sentiment_label": label, "mood_tags": '["derived"]'})
    return pd.DataFrame(rows)
