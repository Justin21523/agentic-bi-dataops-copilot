"""Query endpoints: NL→SQL, SQL validation, SQL execution, query history."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from api.dependencies import get_catalog, get_db, get_executor
from api.schemas import (
    NLQueryRequest, NLQueryResponse,
    SQLValidateRequest, SQLValidateResponse,
    SQLExecuteRequest, SQLExecuteResponse,
    QueryHistoryResponse, QueryHistoryItem,
    ChartRecommendation, ColumnSchema,
)
from features.chart_recommender import ColumnSchema as ChartColSchema, recommend
from models.llm_adapter import get_adapter
from preprocessing.query_executor import QueryError
from preprocessing.validator import validate_sql
from retrieval.schema_retriever import find_relevant_tables, build_schema_prompt
from utils.config import get_settings
from utils.log import get_logger

log = get_logger(__name__)
router = APIRouter()


def _rows_to_dicts(columns: list[str], rows: list[list[Any]]) -> list[dict]:
    return [dict(zip(columns, row)) for row in rows]


@router.post("/nl", response_model=NLQueryResponse)
def natural_language_query(
    req: NLQueryRequest,
    catalog=Depends(get_catalog),
    executor=Depends(get_executor),
):
    """Convert natural language question to SQL, validate, execute, and chart."""
    settings = get_settings()
    adapter = get_adapter(settings.llm_provider)

    # Schema retrieval
    relevant_tables = find_relevant_tables(req.question, catalog, top_k=4)
    schema_ctx = build_schema_prompt(catalog, relevant_tables, include_metrics=True)

    # SQL generation
    sql = ""
    gen_error = None
    try:
        from models.base import FewShotExample
        from pathlib import Path
        few_shot_path = Path("configs/few_shot_examples.yaml")
        few_shot = FewShotExample.load_from_yaml(few_shot_path) if few_shot_path.exists() else []
        sql = adapter.generate_sql(req.question, schema_ctx, few_shot)
    except NotImplementedError:
        gen_error = "No rule-based template matched. Try a different phrasing or enable LLM_PROVIDER=openai."
        sql = "-- No SQL generated"

    # Validation
    vresult = validate_sql(sql, strict=True)
    safety_issues = [vresult.reason] if not vresult.is_safe and vresult.reason else []

    if gen_error:
        return NLQueryResponse(
            question=req.question,
            sql=sql,
            is_safe=False,
            safety_issues=[gen_error],
            error=gen_error,
        )

    if not vresult.is_safe:
        return NLQueryResponse(
            question=req.question,
            sql=sql,
            is_safe=False,
            safety_issues=safety_issues,
            error=vresult.reason,
        )

    # Execution
    result = executor.execute(sql, question=req.question, max_rows=req.max_rows)

    if isinstance(result, QueryError):
        return NLQueryResponse(
            question=req.question,
            sql=sql,
            is_safe=True,
            safety_issues=[],
            error=result.message,
        )

    # Chart recommendation
    col_schemas = [ChartColSchema(name=c, dtype="VARCHAR") for c in result.columns]
    chart = recommend(col_schemas, result.row_count)

    return NLQueryResponse(
        question=req.question,
        sql=sql,
        is_safe=True,
        safety_issues=[],
        rows=_rows_to_dicts(result.columns, result.rows),
        row_count=result.row_count,
        columns=result.columns,
        execution_time_ms=result.execution_time_ms,
        chart_recommendation=ChartRecommendation(**chart.to_dict()),
    )


@router.post("/sql/validate", response_model=SQLValidateResponse)
def validate_sql_endpoint(req: SQLValidateRequest):
    """Validate SQL against guardrails without executing."""
    result = validate_sql(req.sql, strict=True)
    issues = [result.reason] if not result.is_safe and result.reason else []
    return SQLValidateResponse(
        sql=req.sql,
        is_safe=result.is_safe,
        issues=issues,
        risk_level=result.risk_level.value,
    )


@router.post("/sql/execute", response_model=SQLExecuteResponse)
def execute_sql_endpoint(
    req: SQLExecuteRequest,
    executor=Depends(get_executor),
):
    """Execute user-provided SQL (validate first)."""
    vresult = validate_sql(req.sql, strict=True)
    if not vresult.is_safe:
        return SQLExecuteResponse(
            sql=req.sql,
            error=vresult.reason,
        )

    result = executor.execute(req.sql, max_rows=req.max_rows)

    if isinstance(result, QueryError):
        return SQLExecuteResponse(sql=req.sql, error=result.message)

    rows_as_dicts = _rows_to_dicts(result.columns, result.rows)
    return SQLExecuteResponse(
        sql=req.sql,
        rows=rows_as_dicts,
        row_count=result.row_count,
        columns=result.columns,
        execution_time_ms=result.execution_time_ms,
    )


@router.get("/history", response_model=QueryHistoryResponse)
def query_history(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db=Depends(get_db),
):
    """Return recent query history."""
    try:
        rows = db.execute(
            """
            SELECT id, CAST(timestamp AS VARCHAR), question, sql,
                   row_count, execution_time_ms, is_safe
            FROM query_history
            ORDER BY id DESC
            LIMIT ? OFFSET ?
            """,
            [limit, offset],
        ).fetchall()
        total_row = db.execute("SELECT COUNT(*) FROM query_history").fetchone()
        total = total_row[0] if total_row else 0

        items = [
            QueryHistoryItem(
                id=r[0],
                timestamp=str(r[1]),
                question=r[2],
                sql=r[3],
                row_count=r[4],
                execution_time_ms=r[5],
                is_safe=r[6],
            )
            for r in rows
        ]
        return QueryHistoryResponse(items=items, total=total)
    except Exception as e:
        log.warning(f"query_history error: {e}")
        return QueryHistoryResponse(items=[], total=0)
