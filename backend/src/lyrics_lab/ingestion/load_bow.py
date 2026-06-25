from pathlib import Path

import pandas as pd


def load_bow_csv(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    required = {"song_id", "term", "weight", "source"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing BoW columns: {sorted(missing)}")
    forbidden = {"raw_lyrics", "lyrics_text", "full_lyrics", "lyric_lines"}
    if forbidden & set(df.columns):
        raise ValueError("BoW input must not include lyric text columns")
    return df
