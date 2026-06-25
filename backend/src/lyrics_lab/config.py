from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Lyrics Cultural Analytics Lab"
    api_prefix: str = "/api/v1"
    database_path: Path = Path("data/sample/lyrics_lab.duckdb")
    sample_dir: Path = Path("data/sample")
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5185",
        "http://127.0.0.1:5185",
    ]

    model_config = SettingsConfigDict(env_prefix="LYRICS_LAB_", env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
