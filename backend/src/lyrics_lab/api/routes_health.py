from fastapi import APIRouter

from lyrics_lab.api.schemas import HealthResponse
from lyrics_lab.config import get_settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", app=get_settings().app_name)
