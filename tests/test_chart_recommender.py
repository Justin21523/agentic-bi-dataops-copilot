"""Tests for chart recommendation logic."""
import pytest

from features.chart_recommender import ColumnSchema, recommend


def test_recommends_line_for_date_numeric():
    cols = [ColumnSchema(name="date", dtype="DATE"), ColumnSchema(name="revenue", dtype="DOUBLE")]
    rec = recommend(cols, row_count=100)
    assert rec.chart_type == "line"
    assert rec.x_col == "date"
    assert rec.y_col == "revenue"


def test_recommends_bar_for_categorical_numeric():
    cols = [ColumnSchema(name="category", dtype="VARCHAR"), ColumnSchema(name="total", dtype="DOUBLE")]
    rec = recommend(cols, row_count=10)
    assert rec.chart_type == "bar"


def test_recommends_table_for_unrecognized():
    cols = [ColumnSchema(name="a", dtype="VARCHAR"), ColumnSchema(name="b", dtype="VARCHAR")]
    rec = recommend(cols, row_count=10)
    assert rec.chart_type == "table"


def test_recommends_multi_line_for_date_and_multiple_metrics():
    cols = [
        ColumnSchema(name="month", dtype="DATE"),
        ColumnSchema(name="revenue", dtype="DOUBLE"),
        ColumnSchema(name="order_count", dtype="INTEGER"),
    ]
    rec = recommend(cols, row_count=24)
    assert rec.chart_type == "multi_line"


def test_recommends_histogram_for_single_numeric():
    cols = [ColumnSchema(name="score", dtype="INTEGER")]
    rec = recommend(cols, row_count=50)
    assert rec.chart_type == "histogram"


def test_recommends_heatmap_for_two_categoricals_one_numeric():
    cols = [
        ColumnSchema(name="category", dtype="VARCHAR"),
        ColumnSchema(name="state", dtype="VARCHAR"),
        ColumnSchema(name="revenue", dtype="DOUBLE"),
    ]
    rec = recommend(cols, row_count=20)
    assert rec.chart_type == "heatmap"


def test_chart_recommendation_has_config():
    cols = [ColumnSchema(name="date", dtype="DATE"), ColumnSchema(name="revenue", dtype="DOUBLE")]
    rec = recommend(cols, row_count=100)
    assert isinstance(rec.config, dict)
    assert "reasoning" in rec.to_dict()
