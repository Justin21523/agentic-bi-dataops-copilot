from __future__ import annotations

import numpy as np
import pandas as pd

from lyrics_lab.utils.serialization import loads_json


def artist_style_fingerprint(songs: pd.DataFrame, embeddings: pd.DataFrame, artist_id: str) -> dict[str, float]:
    artist_songs = songs[songs["artist_id"] == artist_id]
    joined = artist_songs.merge(embeddings, on="song_id", how="inner")
    vectors = np.array([loads_json(value, []) for value in joined["embedding_json"]], dtype=float)
    if len(vectors) == 0:
        return {
            "topic_diversity": 0.0,
            "sentiment_intensity": 0.0,
            "genre_consistency": 0.0,
            "lyrical_complexity_proxy": 0.0,
            "style_uniqueness": 0.0,
        }
    variance = float(np.mean(np.var(vectors, axis=0)))
    return {
        "topic_diversity": round(min(1.0, 0.35 + variance), 3),
        "sentiment_intensity": round(min(1.0, 0.4 + abs(float(np.mean(vectors))) / 2), 3),
        "genre_consistency": round(1.0 / max(1, artist_songs["genre"].nunique()), 3),
        "lyrical_complexity_proxy": round(min(1.0, 0.45 + len(artist_songs) / 40), 3),
        "style_uniqueness": round(min(1.0, 0.55 + variance * 1.5), 3),
    }
