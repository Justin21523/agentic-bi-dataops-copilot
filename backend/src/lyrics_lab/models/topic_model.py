from __future__ import annotations

import pandas as pd
from sklearn.decomposition import NMF

from lyrics_lab.features.tfidf_features import build_tfidf


def train_topics(bow: pd.DataFrame, n_topics: int = 6) -> tuple[pd.DataFrame, pd.DataFrame]:
    song_ids, vectorizer, matrix = build_tfidf(bow)
    n_topics = min(n_topics, max(2, matrix.shape[0] - 1), matrix.shape[1])
    model = NMF(n_components=n_topics, init="nndsvda", random_state=7, max_iter=500)
    topic_scores = model.fit_transform(matrix)
    terms = vectorizer.get_feature_names_out()
    labels = []
    rows = []
    for topic_id, component in enumerate(model.components_):
        top_terms = [terms[i] for i in component.argsort()[-3:][::-1]]
        labels.append({"topic_id": topic_id, "topic_label": " / ".join(top_terms), "top_terms": top_terms})
    for row_idx, song_id in enumerate(song_ids):
        best_topic = int(topic_scores[row_idx].argmax())
        rows.append(
            {
                "song_id": song_id,
                "topic_id": best_topic,
                "topic_label": labels[best_topic]["topic_label"],
                "topic_score": round(float(topic_scores[row_idx, best_topic]), 4),
            }
        )
    return pd.DataFrame(rows), pd.DataFrame(labels)
