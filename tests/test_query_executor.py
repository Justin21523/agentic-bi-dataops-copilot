"""Tests for query execution with row limit and error handling."""
import pytest


def test_executes_simple_query(seeded_executor_conn):
    from preprocessing.query_executor import QueryExecutor
    executor = QueryExecutor(db_path=":memory:", history_conn=None)
    executor._conn = seeded_executor_conn
    result = executor.execute("SELECT * FROM customers LIMIT 5")
    assert not hasattr(result, "is_error")
    assert result.row_count == 5
    assert "customer_id" in result.columns


def test_respects_row_limit(seeded_executor_conn):
    from preprocessing.query_executor import QueryExecutor
    executor = QueryExecutor(db_path=":memory:", row_limit=3, history_conn=None)
    executor._conn = seeded_executor_conn
    result = executor.execute("SELECT customer_id FROM customers")
    assert len(result.rows) <= 3


def test_handles_invalid_sql(seeded_executor_conn):
    from preprocessing.query_executor import QueryExecutor, QueryError
    executor = QueryExecutor(db_path=":memory:", history_conn=None)
    executor._conn = seeded_executor_conn
    # Referencing a nonexistent column passes the validator but fails at execution
    result = executor.execute("SELECT nonexistent_xyz_col FROM orders LIMIT 1")
    assert isinstance(result, QueryError)
    assert result.error_type == "duckdb_error"


def test_blocks_unsafe_sql(seeded_executor_conn):
    from preprocessing.query_executor import QueryExecutor, QueryError
    executor = QueryExecutor(db_path=":memory:", history_conn=None, strict_validation=True)
    executor._conn = seeded_executor_conn
    result = executor.execute("DROP TABLE customers")
    assert isinstance(result, QueryError)
    assert result.error_type == "validation_error"


def test_executes_join_query(seeded_executor_conn):
    from preprocessing.query_executor import QueryExecutor
    executor = QueryExecutor(db_path=":memory:", history_conn=None)
    executor._conn = seeded_executor_conn
    sql = (
        "SELECT c.name, p.amount "
        "FROM customers c "
        "JOIN orders o ON c.customer_id = o.customer_id "
        "JOIN payments p ON o.order_id = p.order_id "
        "WHERE p.status = 'completed' LIMIT 5"
    )
    result = executor.execute(sql)
    assert not hasattr(result, "is_error")
    assert "name" in result.columns
    assert "amount" in result.columns
