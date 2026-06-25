"""FastAPI dependency injectors — read from app.state."""
from __future__ import annotations

import duckdb
from fastapi import Request

from features.catalog import Catalog
from preprocessing.query_executor import QueryExecutor


def get_db(request: Request) -> duckdb.DuckDBPyConnection:
    return request.app.state.db


def get_catalog(request: Request) -> Catalog:
    return request.app.state.catalog


def get_executor(request: Request) -> QueryExecutor:
    return request.app.state.executor
