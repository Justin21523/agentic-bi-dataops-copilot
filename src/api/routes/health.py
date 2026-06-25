"""GET /health — API and database health check."""
from __future__ import annotations

from datetime import datetime, timezone

import requests as _req
from fastapi import APIRouter, Depends

from api.dependencies import get_db
from api.schemas import HealthResponse
from utils.config import get_settings

router = APIRouter()


def _check_llm_reachable(provider: str, base_url: str) -> bool:
    """Return True if the LLM endpoint responds within 3 seconds."""
    if provider == "rule_based":
        return True
    if provider in ("llama_cpp", "openai"):
        try:
            url = base_url.rstrip("/")
            if not url.endswith("/v1"):
                url += "/v1"
            r = _req.get(url + "/models", timeout=3)
            return r.status_code == 200
        except Exception:
            return False
    return False


@router.get("/health", response_model=HealthResponse)
def health_check(db=Depends(get_db)):
    """Return API health status, database connectivity, and LLM status."""
    try:
        db.execute("SELECT 1")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {e}"

    settings = get_settings()
    llm_reachable = _check_llm_reachable(settings.llm_provider, settings.llama_cpp_base_url)

    return HealthResponse(
        status="ok",
        version="0.1.0",
        db_status=db_status,
        timestamp=datetime.now(timezone.utc).isoformat(),
        llm_provider=settings.llm_provider,
        llm_reachable=llm_reachable,
    )
