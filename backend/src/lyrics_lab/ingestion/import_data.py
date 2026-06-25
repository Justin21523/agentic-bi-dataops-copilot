from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from lyrics_lab.ingestion.prepare_data import prepare

ALIASES = {
    "artists.csv": {
        "id_artist": "artist_id",
        "artist_mbid": "artist_id",
        "wasabi_artist_id": "artist_id",
        "name": "artist_name",
        "artist_name_clean": "artist_name",
        "artist": "artist_name",
        "location": "country",
        "country_name": "country",
        "start_year": "active_start_year",
        "end_year": "active_end_year",
    },
    "songs.csv": {
        "track_id": "song_id",
        "id_song": "song_id",
        "mxm_track_id": "song_id",
        "wasabi_song_id": "song_id",
        "recording_id": "song_id",
        "song": "title",
        "song_title": "title",
        "track_title": "title",
        "artist": "artist_id",
        "artist_mbid": "artist_id",
        "artist_ref": "artist_id",
        "release_year": "year",
        "publicationDate": "year",
        "publication_year": "year",
        "lang": "language",
        "language_code": "language",
        "style": "genre",
        "genre_name": "genre",
        "main_genre": "genre",
    },
    "lyric_bow_features.csv": {
        "track_id": "song_id",
        "mxm_track_id": "song_id",
        "id_song": "song_id",
        "word": "term",
        "token": "term",
        "stem": "term",
        "tfidf": "weight",
        "term_weight": "weight",
        "bow_weight": "weight",
        "count": "weight",
        "dataset": "source",
    },
}


def normalize_aliases(input_dir: Path) -> None:
    for filename, aliases in ALIASES.items():
        path = input_dir / filename
        if not path.exists():
            continue
        df = pd.read_csv(path)
        rename = {column: aliases[column] for column in df.columns if column in aliases and aliases[column] not in df.columns}
        if rename:
            df = df.rename(columns=rename)
            df.to_csv(path, index=False)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", type=Path, required=True)
    args = parser.parse_args()
    normalize_aliases(args.input_dir)
    prepare(input_dir=args.input_dir)


if __name__ == "__main__":
    main()
