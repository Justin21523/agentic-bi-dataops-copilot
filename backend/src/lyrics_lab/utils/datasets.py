from __future__ import annotations

import re
from pathlib import Path

from lyrics_lab.utils.paths import data_dir, sample_dir

DATASET_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]+$")


def uploads_dir() -> Path:
    return data_dir() / "uploads"


def dataset_dir(dataset_id: str | None = None) -> Path:
    resolved = dataset_id or "demo"
    if resolved == "demo":
        return sample_dir()
    if not DATASET_ID_PATTERN.match(resolved):
        raise ValueError("Invalid dataset_id")
    root = uploads_dir() / resolved
    if not root.exists():
        raise FileNotFoundError(resolved)
    return root


def public_dataset_id(path: Path) -> str:
    if path.resolve() == sample_dir().resolve():
        return "demo"
    return path.name
