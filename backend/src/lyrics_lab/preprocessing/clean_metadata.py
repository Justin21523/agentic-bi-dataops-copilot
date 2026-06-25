import pandas as pd


def clean_songs(df: pd.DataFrame) -> pd.DataFrame:
    cleaned = df.copy()
    cleaned["title"] = cleaned["title"].fillna("Untitled")
    cleaned["language"] = cleaned["language"].fillna("unknown")
    cleaned["genre"] = cleaned["genre"].fillna("unknown")
    return cleaned
