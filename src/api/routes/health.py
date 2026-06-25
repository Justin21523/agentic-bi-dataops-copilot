"""GET /health — API and database health check."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from api.dependencies import get_db
from api.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health_check(db=Depends(get_db)):
    """Return API health status and database connectivity."""
    try:
        db.execute("SELECT 1")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {e}"

    return HealthResponse(
        status="ok",
        version="0.1.0",
        db_status=db_status,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
