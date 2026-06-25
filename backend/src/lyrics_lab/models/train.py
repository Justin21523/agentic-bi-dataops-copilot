from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from lyrics_lab.models.genre_classifier import train_genre_classifier
from lyrics_lab.models.similarity import compute_embedding_similarity, compute_similar_songs, compute_topic_similarity
from lyrics_lab.models.topic_model import train_topics
from lyrics_lab.utils.paths import sample_dir


def train(input_dir: Path = sample_dir()) -> None:
    bow = pd.read_csv(input_dir / "lyric_bow_features.csv")
    songs = pd.read_csv(input_dir / "songs.csv")
    embeddings = pd.read_csv(input_dir / "style_embeddings.csv")
    topics, _labels = train_topics(bow)
    predictions, _metrics = train_genre_classifier(bow, songs)
    similar = pd.concat(
        [
            compute_similar_songs(bow, method="tfidf"),
            compute_topic_similarity(topics),
            compute_embedding_similarity(embeddings),
        ],
        ignore_index=True,
    )
    yearly = (
        songs.merge(bow, on="song_id")
        .groupby(["year", "term"], as_index=False)["weight"]
        .mean()
        .rename(columns={"weight": "score"})
        .sort_values(["year", "score"], ascending=[True, False])
    )
    yearly["rank"] = yearly.groupby("year").cumcount() + 1
    yearly = yearly[yearly["rank"] <= 8]
    topics.to_csv(input_dir / "lyric_topics.csv", index=False)
    predictions.to_csv(input_dir / "genre_predictions.csv", index=False)
    similar.to_csv(input_dir / "similar_songs.csv", index=False)
    yearly.to_csv(input_dir / "yearly_terms.csv", index=False)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", type=Path, default=sample_dir())
    args = parser.parse_args()
    train(args.input_dir)


if __name__ == "__main__":
    main()
