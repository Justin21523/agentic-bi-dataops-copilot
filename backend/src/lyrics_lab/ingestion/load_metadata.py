from pathlib import Path

import pandas as pd


def load_csv(path: Path, required: set[str]) -> pd.DataFrame:
    df = pd.read_csv(path)
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing columns: {sorted(missing)}")
    return df
