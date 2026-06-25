"""Application configuration via pydantic-settings (env + .env + YAML defaults)."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import yaml
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_ROOT = Path(__file__).resolve().parents[2]
_YAML_PATH = _ROOT / "configs" / "settings.yaml"


def _load_yaml_defaults() -> dict:
    if _YAML_PATH.exists():
        with open(_YAML_PATH) as f:
            return yaml.safe_load(f) or {}
    return {}


_YAML = _load_yaml_defaults()


class Settings(BaseSettings):
    duckdb_path: str = _YAML.get("duckdb_path", "data/warehouse.duckdb")
    sample_data_path: str = _YAML.get("sample_data_path", "data/sample")
    metadata_catalog_path: str = _YAML.get("metadata_catalog_path", "data/metadata/catalog.yaml")
    log_level: str = _YAML.get("log_level", "INFO")
    max_rows: int = _YAML.get("max_rows", 10000)
    query_timeout: int = _YAML.get("query_timeout", 30)
    api_host: str = _YAML.get("api_host", "0.0.0.0")
    api_port: int = _YAML.get("api_port", 8000)
    llm_provider: str = _YAML.get("llm_provider", "rule_based")
    openai_api_key: str | None = None
    llama_cpp_base_url: str = _YAML.get("llama_cpp_base_url", "http://localhost:8080/v1")
    llama_cpp_model: str = _YAML.get("llama_cpp_model", "default")
    sample_customers: int = _YAML.get("sample_customers", 300)
    sample_products: int = _YAML.get("sample_products", 100)
    sample_orders: int = _YAML.get("sample_orders", 750)
    sample_seed: int = _YAML.get("sample_seed", 42)

    model_config = SettingsConfigDict(
        env_file=str(_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("duckdb_path", "sample_data_path", "metadata_catalog_path", mode="before")
    @classmethod
    def resolve_path(cls, v: str) -> str:
        p = Path(v)
        return str(_ROOT / p) if not p.is_absolute() else v


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


def get_project_root() -> Path:
    return _ROOT
