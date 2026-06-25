from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from lyrics_lab.evaluation.safety_checks import FORBIDDEN_FIELDS

REQUIRED_FILES = {
    "artists.csv": {"artist_id", "artist_name", "country", "active_start_year", "active_end_year"},
    "songs.csv": {"song_id", "title", "artist_id", "album", "year", "language", "genre"},
    "lyric_bow_features.csv": {"song_id", "term", "weight", "source"},
}


def validate_dataset(input_dir: Path) -> dict[str, object]:
    missing_files: list[str] = []
    forbidden_hits: dict[str, list[str]] = {}
    missing_columns: dict[str, list[str]] = {}
    row_counts: dict[str, int] = {}

    for filename, required_columns in REQUIRED_FILES.items():
        path = input_dir / filename
        if not path.exists():
            missing_files.append(filename)
            continue
        df = pd.read_csv(path)
        row_counts[filename] = len(df)
        forbidden = sorted(set(df.columns) & FORBIDDEN_FIELDS)
        missing = sorted(required_columns - set(df.columns))
        if forbidden:
            forbidden_hits[filename] = forbidden
        if missing:
            missing_columns[filename] = missing

    ok = not missing_files and not forbidden_hits and not missing_columns
    return {
        "status": "pass" if ok else "fail",
        "input_dir": str(input_dir),
        "row_counts": row_counts,
        "missing_files": missing_files,
        "missing_columns": missing_columns,
        "forbidden_fields": forbidden_hits,
    }


def enrich_optional_columns(input_dir: Path) -> None:
    artist_path = input_dir / "artists.csv"
    song_path = input_dir / "songs.csv"
    if artist_path.exists():
        artists = pd.read_csv(artist_path)
        if "region" not in artists.columns:
            regions = {"US": "North America", "CA": "North America", "UK": "Europe", "TW": "East Asia", "JP": "East Asia"}
            artists["region"] = artists["country"].map(regions).fillna("Other")
            artists.to_csv(artist_path, index=False)
    if song_path.exists():
        songs = pd.read_csv(song_path)
        if "decade" not in songs.columns:
            songs["decade"] = (songs["year"].astype(int) // 10) * 10
        if "language_family" not in songs.columns:
            families = {"en": "Germanic", "zh": "Sinitic", "es": "Romance", "ja": "Japonic"}
            songs["language_family"] = songs["language"].map(families).fillna("Other")
        songs.to_csv(song_path, index=False)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", type=Path, default=Path("data/sample"))
    args = parser.parse_args()
    result = validate_dataset(args.input_dir)
    print(result)
    if result["status"] != "pass":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
