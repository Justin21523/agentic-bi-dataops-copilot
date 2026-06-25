"""Chart recommendation engine: infers chart type from query result column schema."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

_DATE_TYPES = frozenset({"DATE", "TIMESTAMP", "TIMESTAMPTZ", "TIMESTAMP WITH TIME ZONE"})
_NUMERIC_TYPES = frozenset({
    "INTEGER", "BIGINT", "SMALLINT", "HUGEINT", "DOUBLE",
    "FLOAT", "DECIMAL", "NUMERIC", "REAL",
})

_DATE_RE = re.compile(
    r"(date|month|year|day|week|quarter|timestamp|created_at|updated_at|"
    r"paid_at|period|time|sale_date)",
    re.I,
)
_NUMERIC_RE = re.compile(
    r"\b(revenue|sales|amount|total|count|price|cost|profit|margin|qty|"
    r"quantity|avg|rate|score|rank|num|value|growth|pct|percent|units|"
    r"order_count|avg_order|unique)",
    re.I,
)
_ID_RE = re.compile(r"(_id|^id)$", re.I)


class ColType:
    DATE = "date"
    NUMERIC = "numeric"
    CATEGORICAL = "categorical"


def infer_col_type(col_name: str, duckdb_type: str | None = None) -> str:
    """Infer column type from DuckDB type string, falling back to name heuristics.

    Args:
        col_name: Column name.
        duckdb_type: DuckDB type string from rel.description (preferred).

    Returns:
        One of ColType.DATE, ColType.NUMERIC, ColType.CATEGORICAL.
    """
    if duckdb_type:
        dt = duckdb_type.upper().split("(")[0].strip()
        if any(dt.startswith(p) for p in ("INT", "BIGINT", "SMALLINT", "HUGEINT",
                                           "DOUBLE", "FLOAT", "DECIMAL", "NUMERIC", "REAL")):
            return ColType.NUMERIC
        if any(dt.startswith(p) for p in ("DATE", "TIMESTAMP", "TIME")):
            return ColType.DATE
        return ColType.CATEGORICAL

    # Name heuristics
    if _ID_RE.search(col_name):
        return ColType.CATEGORICAL
    if _DATE_RE.search(col_name):
        return ColType.DATE
    if _NUMERIC_RE.search(col_name):
        return ColType.NUMERIC
    return ColType.CATEGORICAL


@dataclass
class ColumnSchema:
    name: str
    dtype: str


@dataclass
class ChartRecommendation:
    chart_type: str
    x_col: str | None = None
    y_col: str | None = None
    y_cols: list[str] | None = None
    color_col: str | None = None
    config: dict[str, Any] = field(default_factory=dict)
    reasoning: str = ""

    def to_dict(self) -> dict:
        return {
            "chart_type": self.chart_type,
            "x_col": self.x_col,
            "y_col": self.y_col,
            "y_cols": self.y_cols,
            "color_col": self.color_col,
            "config": self.config,
            "reasoning": self.reasoning,
        }


def recommend(
    columns: list[ColumnSchema],
    row_count: int = 0,
) -> ChartRecommendation:
    """Recommend a chart type based on column schema.

    Decision tree (priority order):
    1. >4 columns → table
    2. 1+ date + 2+ numeric, 0 categorical → multi_line
    3. 1 date + 1 numeric → line
    4. 2 categorical + 1 numeric → heatmap
    5. 1 categorical + 1+ numeric → bar
    6. 1 numeric only → histogram
    7. else → table
    """
    if not columns:
        return ChartRecommendation(chart_type="table", reasoning="No columns in result")

    if len(columns) > 4:
        return ChartRecommendation(
            chart_type="table",
            reasoning=f"Wide result ({len(columns)} columns) — tabular display",
        )

    date_cols = [c.name for c in columns if infer_col_type(c.name, c.dtype) == ColType.DATE]
    num_cols = [c.name for c in columns if infer_col_type(c.name, c.dtype) == ColType.NUMERIC]
    cat_cols = [c.name for c in columns if infer_col_type(c.name, c.dtype) == ColType.CATEGORICAL]

    if date_cols and len(num_cols) >= 2 and not cat_cols:
        return ChartRecommendation(
            chart_type="multi_line",
            x_col=date_cols[0],
            y_cols=num_cols,
            config={
                "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
                "mark": "line",
                "encoding": {
                    "x": {"field": date_cols[0], "type": "temporal"},
                },
            },
            reasoning=f"Date + multiple metrics → multi-line time series",
        )

    if date_cols and num_cols:
        return ChartRecommendation(
            chart_type="line",
            x_col=date_cols[0],
            y_col=num_cols[0],
            config={
                "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
                "mark": "line",
                "encoding": {
                    "x": {"field": date_cols[0], "type": "temporal"},
                    "y": {"field": num_cols[0], "type": "quantitative"},
                },
            },
            reasoning=f"Date ({date_cols[0]}) + numeric ({num_cols[0]}) → time series line chart",
        )

    if len(cat_cols) >= 2 and num_cols:
        return ChartRecommendation(
            chart_type="heatmap",
            x_col=cat_cols[0],
            y_col=cat_cols[1],
            color_col=num_cols[0],
            config={
                "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
                "mark": "rect",
                "encoding": {
                    "x": {"field": cat_cols[0], "type": "ordinal"},
                    "y": {"field": cat_cols[1], "type": "ordinal"},
                    "color": {"field": num_cols[0], "type": "quantitative"},
                },
            },
            reasoning=f"Two categoricals + numeric → heatmap",
        )

    if cat_cols and num_cols:
        return ChartRecommendation(
            chart_type="bar",
            x_col=num_cols[0],
            y_col=cat_cols[0],
            config={
                "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
                "mark": "bar",
                "encoding": {
                    "x": {"field": num_cols[0], "type": "quantitative"},
                    "y": {"field": cat_cols[0], "type": "ordinal", "sort": "-x"},
                },
            },
            reasoning=f"Categorical ({cat_cols[0]}) + numeric ({num_cols[0]}) → horizontal bar chart",
        )

    if len(num_cols) == 1 and len(columns) == 1:
        return ChartRecommendation(
            chart_type="histogram",
            x_col=num_cols[0],
            config={
                "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
                "mark": "bar",
                "encoding": {
                    "x": {"field": num_cols[0], "bin": True, "type": "quantitative"},
                    "y": {"aggregate": "count", "type": "quantitative"},
                },
            },
            reasoning=f"Single numeric column → histogram",
        )

    return ChartRecommendation(
        chart_type="table",
        reasoning="No recognized column pattern — tabular display",
    )
