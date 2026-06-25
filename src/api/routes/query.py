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
    FewShotAddRequest, FewShotAddResponse,
    DataFreshnessResponse,
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
    history = [{"role": m.role, "content": m.content} for m in req.conversation_history]
    try:
        from models.base import FewShotExample
        from utils.config import get_project_root
        few_shot_path = get_project_root() / "configs" / "few_shot_examples.yaml"
        few_shot = FewShotExample.load_from_yaml(few_shot_path) if few_shot_path.exists() else []
        sql = adapter.generate_sql(req.question, schema_ctx, few_shot, history)
    except (NotImplementedError, RuntimeError) as exc:
        gen_error = str(exc)
        sql = "-- No SQL generated"

    if gen_error:
        return NLQueryResponse(
            question=req.question,
            sql=sql,
            is_safe=False,
            safety_issues=[gen_error],
            error=gen_error,
            adapter=adapter.adapter_name,
        )

    # Validation — with one auto-correction retry for LLM adapters
    vresult = validate_sql(sql, strict=True)
    if not vresult.is_safe and settings.llm_provider in ("llama_cpp", "openai"):
        try:
            correction_question = (
                f"{req.question}\n\n"
                f"[Previous SQL was rejected: {vresult.reason}. "
                "Fix the query — max subquery depth is 3, use only SELECT statements, "
                "avoid SELECT *, use only whitelisted tables.]"
            )
            sql_retry = adapter.generate_sql(correction_question, schema_ctx, few_shot, history)
            vresult_retry = validate_sql(sql_retry, strict=True)
            if vresult_retry.is_safe:
                sql = sql_retry
                vresult = vresult_retry
                log.info("SQL auto-corrected successfully on retry")
        except Exception as retry_exc:
            log.debug(f"SQL auto-correction failed: {retry_exc}")

    safety_issues = [vresult.reason] if not vresult.is_safe and vresult.reason else []

    if not vresult.is_safe:
        return NLQueryResponse(
            question=req.question,
            sql=sql,
            is_safe=False,
            safety_issues=safety_issues,
            error=vresult.reason,
            adapter=adapter.adapter_name,
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
            adapter=adapter.adapter_name,
        )

    # Chart recommendation
    col_schemas = [ChartColSchema(name=c, dtype="VARCHAR") for c in result.columns]
    chart = recommend(col_schemas, result.row_count)

    return NLQueryResponse(
        question=req.question,
        sql=sql,
        is_safe=True,
        safety_issues=[],
        rows=result.rows,
        row_count=result.row_count,
        columns=result.columns,
        execution_time_ms=result.execution_time_ms,
        chart_recommendation=ChartRecommendation(**chart.to_dict()),
        adapter=adapter.adapter_name,
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

    return SQLExecuteResponse(
        sql=req.sql,
        rows=result.rows,
        row_count=result.row_count,
        columns=result.columns,
        execution_time_ms=result.execution_time_ms,
    )


@router.get("/freshness", response_model=DataFreshnessResponse)
def data_freshness(db=Depends(get_db)):
    """Return the most recent data timestamp for each warehouse table."""
    import datetime

    TABLE_DATE_COLS = {
        "orders": "order_date",
        "order_items": None,
        "customers": "signup_date",
        "products": None,
        "payments": "paid_at",
        "reviews": "created_at",
        "daily_sales": "date",
        "query_history": "timestamp",
    }
    results: dict[str, str | None] = {}
    try:
        for table, date_col in TABLE_DATE_COLS.items():
            if date_col is None:
                results[table] = None
                continue
            try:
                row = db.execute(
                    f"SELECT MAX({date_col})::VARCHAR FROM {table}"
                ).fetchone()
                results[table] = row[0] if row and row[0] else None
            except Exception as e:
                log.debug(f"Freshness query skipped for {table}.{date_col}: {e}")
                results[table] = None
    except Exception as exc:
        log.exception(f"Freshness endpoint failed: {exc}")
        raise

    return DataFreshnessResponse(
        tables=results,
        generated_at=datetime.datetime.utcnow().isoformat() + "Z",
    )


@router.post("/few-shot/add", response_model=FewShotAddResponse)
def add_few_shot_example(req: FewShotAddRequest):
    """Append a validated (question, SQL) pair to the few-shot examples YAML."""
    from pathlib import Path
    import yaml
    from utils.config import get_project_root

    few_shot_path = get_project_root() / "configs" / "few_shot_examples.yaml"
    try:
        existing = []
        if few_shot_path.exists():
            with open(few_shot_path) as f:
                existing = yaml.safe_load(f) or []

        # Deduplicate by question (case-insensitive)
        q_lower = req.question.strip().lower()
        for ex in existing:
            if ex.get("question", "").strip().lower() == q_lower:
                return FewShotAddResponse(
                    success=False,
                    total_examples=len(existing),
                    message="Example with identical question already exists.",
                )

        new_entry: dict = {"question": req.question.strip(), "sql": req.sql.strip()}
        if req.notes:
            new_entry["notes"] = req.notes
        existing.append(new_entry)

        with open(few_shot_path, "w") as f:
            yaml.dump(existing, f, allow_unicode=True, default_flow_style=False, sort_keys=False)

        return FewShotAddResponse(success=True, total_examples=len(existing), message="Added.")
    except Exception as exc:
        return FewShotAddResponse(success=False, total_examples=0, message=str(exc))


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
