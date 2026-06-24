"""Tests for schema retrieval and prompt building."""
import pytest


def test_retrieves_customers_for_customer_question(test_catalog):
    from retrieval.schema_retriever import find_relevant_tables
    tables = find_relevant_tables("show me all customers by city", test_catalog)
    assert "customers" in tables


def test_retrieves_payments_for_revenue_question(test_catalog):
    from retrieval.schema_retriever import find_relevant_tables
    tables = find_relevant_tables("what is the total revenue this month?", test_catalog)
    assert "payments" in tables or "daily_sales" in tables


def test_builds_schema_prompt_contains_columns(test_catalog):
    from retrieval.schema_retriever import build_schema_prompt
    prompt = build_schema_prompt(test_catalog, ["customers"])
    assert "customer_id" in prompt
    assert "customers" in prompt
    assert "Table:" in prompt


def test_handles_unknown_table(test_catalog):
    result = test_catalog.get_table("nonexistent_xyz_table")
    assert result is None


def test_find_relevant_tables_returns_list(test_catalog):
    from retrieval.schema_retriever import find_relevant_tables
    tables = find_relevant_tables("daily sales trend", test_catalog, top_k=3)
    assert isinstance(tables, list)
    assert len(tables) <= 3


def test_full_schema_prompt_includes_all_tables(test_catalog):
    from retrieval.schema_retriever import get_full_schema_prompt
    prompt = get_full_schema_prompt(test_catalog)
    for tname in ["orders", "customers", "products", "payments"]:
        assert tname in prompt
