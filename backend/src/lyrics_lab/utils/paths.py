from pathlib import Path


def project_root() -> Path:
    return Path(__file__).resolve().parents[4]


def data_dir() -> Path:
    return project_root() / "data"


def sample_dir() -> Path:
    return data_dir() / "sample"
