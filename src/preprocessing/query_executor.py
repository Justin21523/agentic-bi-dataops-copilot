"""Read-only DuckDB query executor with timeout, row limit, and history logging."""
from __future__ import annotations

import threading
import time
from pathlib import Path
from typing import Any

import duckdb
import sqlparse
from sqlparse import tokens as T

from preprocessing.validator import validate_sql, ValidationResult, RiskLevel
from utils.log import get_logger

log = get_logger(__name__)


class QueryExecutionError(Exception):
    """Raised when a query fails to execute."""
    pass


class QueryResult:
    """Successful query result."""

    def __init__(
        self,
        columns: list[str],
        rows: list[list[Any]],
        execution_time_ms: float,
    ) -> None:
        self.columns = columns
        self.rows = rows
        self.row_count = len(rows)
        self.execution_time_ms = execution_time_ms

    def to_dict(self) -> dict:
        return {
            "columns": self.columns,
            "rows": self.rows,
            "row_count": self.row_count,
            "execution_time_ms": self.execution_time_ms,
        }


class QueryError:
    """Failed query result."""

    def __init__(self, error_type: str, message: str, sql_snippet: str = "") -> None:
        self.error_type = error_type
        self.message = message
        self.sql_snippet = sql_snippet[:200]
        self.is_error = True

    def to_dict(self) -> dict:
        return {
            "error_type": self.error_type,
            "message": self.message,
            "sql_snippet": self.sql_snippet,
        }


def _has_limit(sql: str) -> bool:
    """Check whether SQL already contains a LIMIT clause."""
    stmt = sqlparse.parse(sql)[0]
    return any(
        tok.ttype == T.Keyword and tok.normalized.upper() == "LIMIT"
        for tok in stmt.flatten()
    )


def _inject_limit(sql: str, row_limit: int) -> str:
    """Append LIMIT clause if not already present."""
    sql = sql.rstrip().rstrip(";")
    if not _has_limit(sql):
        return f"SELECT * FROM ({sql}) _q LIMIT {row_limit}"
    return sql


class QueryExecutor:
    """Thin wrapper around a read-only DuckDB connection.

    Uses threading.Thread with timeout for query cancellation (DuckDB has no
    native Python-level cancel). On timeout, the connection is recycled.
    """

    def __init__(
        self,
        db_path: str,
        timeout_seconds: int = 30,
        row_limit: int = 10_000,
        history_conn: duckdb.DuckDBPyConnection | None = None,
        strict_validation: bool = True,
    ) -> None:
        self._db_path = db_path
        self._timeout = timeout_seconds
        self._row_limit = row_limit
        self._strict = strict_validation
        self._history_conn = history_conn
        self._conn = self._open()
        self._history_counter = 0
        if self._history_conn:
            row = self._history_conn.execute(
                "SELECT COALESCE(MAX(id), 0) FROM query_history"
            ).fetchone()
            self._history_counter = row[0] if row else 0

    def _open(self) -> duckdb.DuckDBPyConnection:
        if self._db_path == ":memory:":
            return duckdb.connect(":memory:")
        Path(self._db_path).parent.mkdir(parents=True, exist_ok=True)
        return duckdb.connect(self._db_path, read_only=True)

    def execute(
        self,
        sql: str,
        question: str = "",
        max_rows: int | None = None,
    ) -> QueryResult | QueryError:
        """Validate and execute SQL, returning QueryResult or QueryError.

        Args:
            sql: SQL string (must pass validation).
            question: Original NL question for history logging.
            max_rows: Override row limit for this query.
        """
        limit = max_rows or self._row_limit
        validation = validate_sql(sql, strict=self._strict)

        if not validation.is_safe:
            self._log_history(question, sql, None, None, validation.reason, validation)
            return QueryError(
                error_type="validation_error",
                message=validation.reason,
                sql_snippet=sql,
            )

        limited_sql = _inject_limit(sql, limit)
        result: QueryResult | None = None
        exc_holder: list[Exception] = []
        start = time.perf_counter()

        def _run() -> None:
            try:
                rel = self._conn.execute(limited_sql)
                columns = [desc[0] for desc in rel.description]
                rows = [list(r) for r in rel.fetchall()]
                elapsed = (time.perf_counter() - start) * 1000
                nonlocal result
                result = QueryResult(
                    columns=columns,
                    rows=rows,
                    execution_time_ms=round(elapsed, 2),
                )
            except Exception as e:
                exc_holder.append(e)

        thread = threading.Thread(target=_run, daemon=True)
        thread.start()
        thread.join(timeout=self._timeout)

        if thread.is_alive():
            self._conn.close()
            self._conn = self._open()
            err = QueryError("timeout", f"Query exceeded {self._timeout}s timeout", sql)
            self._log_history(question, sql, None, None, err.message, validation)
            return err

        if exc_holder:
            err = QueryError("duckdb_error", str(exc_holder[0]), sql)
            self._log_history(question, sql, None, None, err.message, validation)
            return err

        self._log_history(
            question, sql, result.row_count, result.execution_time_ms, None, validation
        )
        return result

    def _log_history(
        self,
        question: str,
        sql: str,
        row_count: int | None,
        exec_time_ms: float | None,
        error_message: str | None,
        validation: ValidationResult,
    ) -> None:
        """Write one row to query_history table via the writable history connection."""
        if self._history_conn is None:
            return
        try:
            self._history_counter += 1
            self._history_conn.execute(
                """
                INSERT INTO query_history
                    (id, question, sql, row_count, execution_time_ms, is_safe, error_message)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    self._history_counter,
                    question or None,
                    sql,
                    row_count,
                    exec_time_ms,
                    validation.is_safe,
                    error_message,
                ],
            )
        except Exception as e:
            log.warning(f"Failed to write query history: {e}")

    def close(self) -> None:
        self._conn.close()
