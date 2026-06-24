"""Tests for SQL guardrail validation — the most security-critical module."""
import pytest
from preprocessing.validator import validate_sql, RiskLevel


def test_blocks_drop_statement():
    result = validate_sql("DROP TABLE customers")
    assert not result.is_safe
    assert result.risk_level == RiskLevel.CRITICAL
    assert "Forbidden keyword" in result.reason or "DROP" in result.reason


def test_blocks_delete_statement():
    result = validate_sql("DELETE FROM customers WHERE 1=1")
    assert not result.is_safe
    assert result.risk_level == RiskLevel.CRITICAL


def test_blocks_unlimited_select_star():
    result = validate_sql("SELECT * FROM customers")
    assert not result.is_safe
    assert result.risk_level == RiskLevel.WARNING


def test_allows_select_star_with_limit():
    result = validate_sql("SELECT * FROM customers LIMIT 10")
    assert result.is_safe
    assert result.risk_level == RiskLevel.SAFE


def test_blocks_multi_statement():
    result = validate_sql("SELECT * FROM customers LIMIT 1; SELECT * FROM products LIMIT 1")
    assert not result.is_safe
    assert result.risk_level == RiskLevel.CRITICAL
    assert "Multiple" in result.reason or "statements" in result.reason.lower()


def test_allows_valid_select_with_limit():
    result = validate_sql(
        "SELECT customer_id, name FROM customers WHERE country = 'US' LIMIT 100"
    )
    assert result.is_safe
    assert result.risk_level == RiskLevel.SAFE


def test_blocks_non_whitelisted_table():
    result = validate_sql("SELECT * FROM sys_users LIMIT 10")
    assert not result.is_safe
    assert "whitelisted" in result.reason.lower() or "allowed" in result.reason.lower()


def test_blocks_update_statement():
    result = validate_sql("UPDATE customers SET name = 'hacked' WHERE 1=1")
    assert not result.is_safe
    assert result.risk_level == RiskLevel.CRITICAL


def test_blocks_insert_statement():
    result = validate_sql("INSERT INTO customers (customer_id, name) VALUES ('X', 'Y')")
    assert not result.is_safe


def test_allows_join_query():
    sql = (
        "SELECT c.name, SUM(p.amount) AS total "
        "FROM customers c "
        "JOIN orders o ON c.customer_id = o.customer_id "
        "JOIN payments p ON o.order_id = p.order_id "
        "WHERE p.status = 'completed' "
        "GROUP BY c.name "
        "ORDER BY total DESC LIMIT 10"
    )
    result = validate_sql(sql)
    assert result.is_safe


def test_allows_cte_query():
    sql = (
        "WITH monthly AS ("
        "  SELECT DATE_TRUNC('month', paid_at) AS month, SUM(amount) AS revenue "
        "  FROM payments WHERE status = 'completed' GROUP BY 1"
        ") "
        "SELECT month, revenue FROM monthly ORDER BY month LIMIT 24"
    )
    result = validate_sql(sql)
    assert result.is_safe
