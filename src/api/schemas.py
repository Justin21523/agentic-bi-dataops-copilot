"""Pydantic v2 request and response models for the BI Copilot API."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# ── Shared / nested ─────────────────────────────────────────────────────────

class ColumnInfo(BaseModel):
    name: str
    dtype: str
    description: str = ""
    nullable: bool = True
    semantic_tags: list[str] = Field(default_factory=list)
    sample_values: list[Any] = Field(default_factory=list)


class ColumnSchema(BaseModel):
    name: str
    dtype: str


class ChartRecommendation(BaseModel):
    chart_type: str
    x_col: str | None = None
    y_col: str | None = None
    y_cols: list[str] | None = None
    color_col: str | None = None
    config: dict[str, Any] = Field(default_factory=dict)
    reasoning: str = ""


class DQColumnReport(BaseModel):
    column_name: str
    dtype: str
    null_count: int
    null_pct: float
    distinct_count: int
    min_val: str | None = None
    max_val: str | None = None


class DQTableReport(BaseModel):
    table_name: str
    row_count: int
    columns: list[DQColumnReport]


class QueryHistoryItem(BaseModel):
    id: int
    timestamp: str
    question: str | None
    sql: str
    row_count: int | None
    execution_time_ms: float | None
    is_safe: bool | None

    model_config = ConfigDict(from_attributes=True)


# ── Request models ───────────────────────────────────────────────────────────

class NLQueryRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=1000)
    max_rows: int = Field(default=1000, ge=1, le=10000)


class SQLValidateRequest(BaseModel):
    sql: str = Field(..., min_length=1)


class SQLExecuteRequest(BaseModel):
    sql: str = Field(..., min_length=1)
    max_rows: int = Field(default=1000, ge=1, le=10000)


class ChartRecommendRequest(BaseModel):
    columns: list[ColumnSchema]
    row_count: int = 0


# ── Response models ──────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str
    db_status: str
    timestamp: str


class TableSummary(BaseModel):
    name: str
    description: str
    row_count_approx: int | None = None
    column_count: int


class TableSchemaResponse(BaseModel):
    name: str
    description: str
    primary_key: str
    row_count_approx: int | None = None
    columns: list[ColumnInfo]
    relationships: list[dict[str, str]] = Field(default_factory=list)


class NLQueryResponse(BaseModel):
    question: str
    sql: str
    is_safe: bool
    safety_issues: list[str] = Field(default_factory=list)
    rows: list[dict[str, Any]] = Field(default_factory=list)
    row_count: int = 0
    columns: list[str] = Field(default_factory=list)
    execution_time_ms: float | None = None
    chart_recommendation: ChartRecommendation | None = None
    error: str | None = None


class SQLValidateResponse(BaseModel):
    sql: str
    is_safe: bool
    issues: list[str] = Field(default_factory=list)
    risk_level: str = "safe"


class SQLExecuteResponse(BaseModel):
    sql: str
    rows: list[dict[str, Any]] = Field(default_factory=list)
    row_count: int = 0
    columns: list[str] = Field(default_factory=list)
    execution_time_ms: float | None = None
    error: str | None = None


class QueryHistoryResponse(BaseModel):
    items: list[QueryHistoryItem]
    total: int


class DQReport(BaseModel):
    generated_at: str
    tables: list[DQTableReport]
