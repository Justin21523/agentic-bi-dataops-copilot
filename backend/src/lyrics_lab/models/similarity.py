from __future__ import annotations

import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

from lyrics_lab.features.tfidf_features import build_tfidf
from lyrics_lab.utils.serialization import loads_json


def compute_similar_songs(bow: pd.DataFrame, top_k: int = 5, method: str = "tfidf") -> pd.DataFrame:
    song_ids, _vectorizer, matrix = build_tfidf(bow)
    scores = cosine_similarity(matrix)
    rows = []
    for idx, song_id in enumerate(song_ids):
        candidates = sorted(
            [(song_ids[j], float(scores[idx, j])) for j in range(len(song_ids)) if j != idx],
            key=lambda item: item[1],
            reverse=True,
        )[:top_k]
        for similar_id, score in candidates:
            rows.append(
                {
                    "song_id": song_id,
                    "similar_song_id": similar_id,
                    "similarity_score": round(score, 4),
                    "method": method,
                }
            )
    return pd.DataFrame(rows)


def compute_topic_similarity(topics: pd.DataFrame, top_k: int = 5) -> pd.DataFrame:
    rows = []
    topic_by_song = topics.set_index("song_id")
    for song_id, row in topic_by_song.iterrows():
        candidates = []
        for other_id, other in topic_by_song.iterrows():
            if song_id == other_id:
                continue
            same_topic = 1.0 if int(row["topic_id"]) == int(other["topic_id"]) else 0.25
            score = same_topic * (1.0 - abs(float(row["topic_score"]) - float(other["topic_score"])))
            candidates.append((other_id, max(0.0, score)))
        for similar_id, score in sorted(candidates, key=lambda item: item[1], reverse=True)[:top_k]:
            rows.append({"song_id": song_id, "similar_song_id": similar_id, "similarity_score": round(float(score), 4), "method": "topic_vector"})
    return pd.DataFrame(rows)


def compute_embedding_similarity(embeddings: pd.DataFrame, top_k: int = 5) -> pd.DataFrame:
    song_ids = embeddings["song_id"].tolist()
    matrix = [loads_json(value, []) for value in embeddings["embedding_json"]]
    scores = cosine_similarity(matrix)
    rows = []
    for idx, song_id in enumerate(song_ids):
        candidates = sorted(
            [(song_ids[j], float(scores[idx, j])) for j in range(len(song_ids)) if j != idx],
            key=lambda item: item[1],
            reverse=True,
        )[:top_k]
        for similar_id, score in candidates:
            rows.append({"song_id": song_id, "similar_song_id": similar_id, "similarity_score": round(score, 4), "method": "style_embedding"})
    return pd.DataFrame(rows)
