from __future__ import annotations

import argparse
from pathlib import Path

import math
import pandas as pd

from lyrics_lab.ingestion.etl import load_sample_to_duckdb
from lyrics_lab.ingestion.data_quality import build_quality_report
from lyrics_lab.ingestion.generate_sample_data import generate
from lyrics_lab.ingestion.validate_safe_data import enrich_optional_columns, validate_dataset
from lyrics_lab.models.sentiment_model import score_bow_sentiment
from lyrics_lab.models.train import train
from lyrics_lab.evaluation.run_evaluation import evaluate
from lyrics_lab.utils.paths import sample_dir
from lyrics_lab.utils.serialization import dumps_json


def ensure_optional_derived_inputs(input_dir: Path) -> None:
    bow = pd.read_csv(input_dir / "lyric_bow_features.csv")
    songs = pd.read_csv(input_dir / "songs.csv")
    sentiment_path = input_dir / "sentiment_scores.csv"
    if not sentiment_path.exists():
        score_bow_sentiment(bow).to_csv(sentiment_path, index=False)
    embedding_path = input_dir / "style_embeddings.csv"
    if not embedding_path.exists():
        genres = {genre: idx for idx, genre in enumerate(sorted(songs["genre"].dropna().unique()))}
        rows = []
        for index, song in enumerate(songs.to_dict("records")):
            base = genres.get(song.get("genre"), 0) / max(1, len(genres))
            vector = [round(math.sin(base + dim * 0.7 + index * 0.03), 4) for dim in range(8)]
            rows.append({"song_id": song["song_id"], "embedding_json": dumps_json(vector), "model_name": "deterministic-style-v1"})
        pd.DataFrame(rows).to_csv(embedding_path, index=False)


def prepare(input_dir: Path | None = None, output_dir: Path = sample_dir(), song_count: int = 300) -> None:
    source = input_dir or output_dir
    if input_dir is None:
        generate(output_dir=output_dir, song_count=song_count)
    enrich_optional_columns(source)
    result = validate_dataset(source)
    if result["status"] != "pass":
        raise ValueError(f"Dataset safety validation failed: {result}")
    ensure_optional_derived_inputs(source)
    train(source)
    evaluate(source)
    build_quality_report(source)
    load_sample_to_duckdb(source)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", type=Path)
    parser.add_argument("--output-dir", type=Path, default=sample_dir())
    parser.add_argument("--song-count", type=int, default=300)
    args = parser.parse_args()
    prepare(args.input_dir, args.output_dir, args.song_count)


if __name__ == "__main__":
    main()
