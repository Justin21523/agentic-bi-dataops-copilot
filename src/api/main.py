"""FastAPI application factory with lifespan-managed DuckDB and catalog."""
from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import chart, dq, health, metadata, query
from features.catalog import load_catalog
from ingestion.warehouse import create_schema, get_connection
from preprocessing.query_executor import QueryExecutor
from utils.config import get_settings
from utils.log import get_logger

log = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: open DuckDB, load catalog, init executor. Shutdown: close connections."""
    settings = get_settings()
    log.info("Starting Agentic BI DataOps Copilot API")

    conn = get_connection(settings.duckdb_path)
    create_schema(conn)

    catalog = load_catalog(Path(settings.metadata_catalog_path))

    executor = QueryExecutor(
        db_path=":memory:",
        timeout_seconds=settings.query_timeout,
        row_limit=settings.max_rows,
        history_conn=conn,
        strict_validation=True,
    )
    executor._conn = conn  # reuse the single writable connection; validator provides safety

    app.state.db = conn
    app.state.catalog = catalog
    app.state.executor = executor

    log.info("API startup complete — warehouse: %s", settings.duckdb_path)
    yield

    executor.close()
    conn.close()
    log.info("API shutdown complete")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Agentic BI / DataOps Copilot",
        description=(
            "Schema-aware Text2SQL + SQL guardrails over a DuckDB retail warehouse. "
            "Supports natural language queries, SQL safety validation, "
            "chart recommendations, and data quality reports."
        ),
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, tags=["health"])
    app.include_router(metadata.router, prefix="/metadata", tags=["metadata"])
    app.include_router(query.router, prefix="/query", tags=["query"])
    app.include_router(chart.router, prefix="/chart", tags=["chart"])
    app.include_router(dq.router, prefix="/dq", tags=["data-quality"])

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "api.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True,
    )
