from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from lyrics_lab.db.connection import connect, init_db
from lyrics_lab.utils.paths import sample_dir

TABLE_FILES = {
    "artists": "artists.csv",
    "songs": "songs.csv",
    "lyric_bow_features": "lyric_bow_features.csv",
    "sentiment_scores": "sentiment_scores.csv",
    "style_embeddings": "style_embeddings.csv",
    "lyric_topics": "lyric_topics.csv",
    "genre_predictions": "genre_predictions.csv",
    "yearly_terms": "yearly_terms.csv",
    "similar_songs": "similar_songs.csv",
}


def load_sample_to_duckdb(input_dir: Path = sample_dir(), db_path: Path | None = None) -> None:
    init_db(db_path)
    with connect(db_path) as con:
        for table, filename in TABLE_FILES.items():
            path = input_dir / filename
            if not path.exists():
                continue
            df = pd.read_csv(path)
            columns = [row[1] for row in con.execute(f"PRAGMA table_info('{table}')").fetchall()]
            for column in columns:
                if column not in df.columns:
                    df[column] = None
            df = df[columns]
            con.execute(f"DELETE FROM {table}")
            con.register("df_view", df)
            con.execute(f"INSERT INTO {table} SELECT * FROM df_view")
            con.unregister("df_view")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", type=Path, default=sample_dir())
    args = parser.parse_args()
    load_sample_to_duckdb(args.input_dir)


if __name__ == "__main__":
    main()
