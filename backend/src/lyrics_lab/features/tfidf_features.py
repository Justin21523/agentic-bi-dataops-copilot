from __future__ import annotations

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer


def bow_to_documents(bow: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for song_id, group in bow.groupby("song_id"):
        tokens: list[str] = []
        for item in group.itertuples():
            repeat = max(1, int(float(item.weight) * 3))
            tokens.extend([str(item.term)] * repeat)
        rows.append({"song_id": song_id, "document": " ".join(tokens)})
    return pd.DataFrame(rows)


def build_tfidf(bow: pd.DataFrame):
    docs = bow_to_documents(bow)
    vectorizer = TfidfVectorizer(min_df=1)
    matrix = vectorizer.fit_transform(docs["document"])
    return docs["song_id"].tolist(), vectorizer, matrix
