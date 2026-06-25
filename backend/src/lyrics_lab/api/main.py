from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from lyrics_lab.api import routes_analysis, routes_analytics, routes_artists, routes_data_quality, routes_datasets, routes_export, routes_health, routes_models, routes_safety, routes_songs
from lyrics_lab.config import get_settings
from lyrics_lab.logging_config import configure_logging


def create_app() -> FastAPI:
    configure_logging()
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(routes_health.router, prefix=settings.api_prefix)
    app.include_router(routes_songs.router, prefix=settings.api_prefix)
    app.include_router(routes_artists.router, prefix=settings.api_prefix)
    app.include_router(routes_analytics.router, prefix=settings.api_prefix)
    app.include_router(routes_analysis.router, prefix=settings.api_prefix)
    app.include_router(routes_datasets.router, prefix=settings.api_prefix)
    app.include_router(routes_models.router, prefix=settings.api_prefix)
    app.include_router(routes_safety.router, prefix=settings.api_prefix)
    app.include_router(routes_export.router, prefix=settings.api_prefix)
    app.include_router(routes_data_quality.router, prefix=settings.api_prefix)
    return app


app = create_app()
