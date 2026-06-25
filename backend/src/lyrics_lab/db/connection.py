from pathlib import Path

import duckdb

from lyrics_lab.config import get_settings


def connect(db_path: Path | None = None) -> duckdb.DuckDBPyConnection:
    path = db_path or get_settings().database_path
    path.parent.mkdir(parents=True, exist_ok=True)
    return duckdb.connect(str(path))


def init_db(db_path: Path | None = None) -> None:
    schema_path = Path(__file__).with_name("schema.sql")
    with connect(db_path) as con:
        for table in [
            "similar_songs",
            "yearly_terms",
            "genre_predictions",
            "style_embeddings",
            "sentiment_scores",
            "lyric_topics",
            "lyric_bow_features",
            "songs",
            "artists",
        ]:
            con.execute(f"DROP TABLE IF EXISTS {table}")
        con.execute(schema_path.read_text(encoding="utf-8"))
