"""Rule-based Text2SQL adapter using regex templates over the retail warehouse schema."""
from __future__ import annotations

import re
from dataclasses import dataclass

from models.base import FewShotExample, Text2SQLAdapter


@dataclass
class Template:
    """A regex pattern with a corresponding SQL template."""

    pattern: re.Pattern
    sql: str
    description: str


_TEMPLATES: list[Template] = [
    Template(
        pattern=re.compile(
            r"top\s+(?P<n>\d+)\s+customers?\s+by\s+"
            r"(?P<metric>revenue|spending|sales|amount|value)",
            re.I,
        ),
        sql=(
            "SELECT c.customer_id, c.name, "
            "ROUND(SUM(p.amount), 2) AS total_{metric} "
            "FROM customers c "
            "JOIN orders o ON c.customer_id = o.customer_id "
            "JOIN payments p ON o.order_id = p.order_id "
            "WHERE p.status = 'completed' "
            "GROUP BY c.customer_id, c.name "
            "ORDER BY total_{metric} DESC "
            "LIMIT {n}"
        ),
        description="Top N customers by revenue/spending",
    ),
    Template(
        pattern=re.compile(
            r"(?:total\s+)?(?P<metric>revenue|sales|amount|payments?)\s+"
            r"(?:by|per)\s+(?P<period>month|year|week|quarter|day)",
            re.I,
        ),
        sql=(
            "SELECT DATE_TRUNC('{period}', p.paid_at) AS {period}, "
            "ROUND(SUM(p.amount), 2) AS total_{metric} "
            "FROM payments p "
            "WHERE p.status = 'completed' "
            "GROUP BY 1 "
            "ORDER BY 1"
        ),
        description="Total revenue aggregated by time period",
    ),
    Template(
        pattern=re.compile(
            r"(?:number|count|how many)\s+(?:of\s+)?orders?\s+"
            r"(?:by|per)\s+(?P<dimension>month|year|status|day)",
            re.I,
        ),
        sql=(
            "SELECT {dimension}, COUNT(*) AS order_count "
            "FROM ("
            "  SELECT order_id, status, "
            "  DATE_TRUNC('{dimension}', order_date) AS {dimension} "
            "  FROM orders"
            ") t "
            "GROUP BY 1 "
            "ORDER BY 1"
        ),
        description="Count of orders grouped by dimension",
    ),
    Template(
        pattern=re.compile(
            r"(?:average|avg|mean)\s+(?:order\s+)?"
            r"(?P<metric>revenue|value|amount|price|spending|aov)",
            re.I,
        ),
        sql=(
            "SELECT ROUND(AVG(p.amount), 2) AS avg_{metric} "
            "FROM payments p "
            "WHERE p.status = 'completed'"
        ),
        description="Average order value / revenue",
    ),
    Template(
        pattern=re.compile(
            r"(?:best[\s-]selling|top\s+(?P<n2>\d+)\s+)?products?\s*"
            r"(?:by\s+(?P<metric2>quantity|sales|revenue|units?))?",
            re.I,
        ),
        sql=(
            "SELECT p.product_id, p.name, p.category, "
            "SUM(oi.quantity) AS total_units_sold, "
            "ROUND(SUM(oi.line_total), 2) AS total_revenue "
            "FROM products p "
            "JOIN order_items oi ON p.product_id = oi.product_id "
            "JOIN orders o ON oi.order_id = o.order_id "
            "WHERE o.status = 'completed' "
            "GROUP BY p.product_id, p.name, p.category "
            "ORDER BY total_units_sold DESC "
            "LIMIT {n2}"
        ),
        description="Best-selling products by quantity or revenue",
    ),
    Template(
        pattern=re.compile(
            r"(?:average|avg)\s+(?:product\s+)?rating"
            r"(?:\s+(?:by|per)\s+(?P<dimension>product|category))?",
            re.I,
        ),
        sql=(
            "SELECT p.{dimension}, "
            "ROUND(AVG(r.score), 2) AS avg_rating, "
            "COUNT(r.review_id) AS review_count "
            "FROM reviews r "
            "JOIN products p ON r.product_id = p.product_id "
            "GROUP BY p.{dimension} "
            "ORDER BY avg_rating DESC "
            "LIMIT 20"
        ),
        description="Average product rating by product or category",
    ),
    Template(
        pattern=re.compile(
            r"(?:daily|day(?:ly)?|recent)\s+"
            r"(?P<metric>revenue|sales|orders?|trend|summary)",
            re.I,
        ),
        sql=(
            "SELECT date, revenue, order_count, avg_order_value, "
            "unique_customers, units_sold, top_category "
            "FROM daily_sales "
            "ORDER BY date DESC "
            "LIMIT 30"
        ),
        description="Daily sales trend from pre-aggregated table",
    ),
    Template(
        pattern=re.compile(
            r"(?:list|show|display|get)\s+(?:all|me\s+all\s+)?"
            r"(?:the\s+)?customers?",
            re.I,
        ),
        sql=(
            "SELECT customer_id, name, city, state, country, segment, signup_date "
            "FROM customers "
            "ORDER BY customer_id "
            "LIMIT 100"
        ),
        description="List customers",
    ),
    Template(
        pattern=re.compile(
            r"order(?:s)?\s+(?:by\s+)?status|status\s+(?:of\s+)?orders?",
            re.I,
        ),
        sql=(
            "SELECT status, COUNT(*) AS order_count, "
            "ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS pct_of_total "
            "FROM orders "
            "GROUP BY status "
            "ORDER BY order_count DESC"
        ),
        description="Order count breakdown by status",
    ),
    Template(
        pattern=re.compile(
            r"(?:revenue|sales)\s+(?:by|per)\s+(?:product\s+)?category",
            re.I,
        ),
        sql=(
            "SELECT p.category, "
            "ROUND(SUM(oi.line_total), 2) AS total_revenue, "
            "SUM(oi.quantity) AS total_units "
            "FROM order_items oi "
            "JOIN products p ON oi.product_id = p.product_id "
            "JOIN orders o ON oi.order_id = o.order_id "
            "WHERE o.status = 'completed' "
            "GROUP BY p.category "
            "ORDER BY total_revenue DESC"
        ),
        description="Revenue breakdown by product category",
    ),
]

_DEFAULTS: dict[str, str] = {
    "n": "10",
    "n2": "10",
    "metric": "revenue",
    "metric2": "revenue",
    "period": "month",
    "dimension": "category",
}


def _fill_template(sql: str, match: re.Match, defaults: dict[str, str]) -> str:
    """Fill named capture groups into SQL template, applying defaults."""
    groups = {k: (v or defaults.get(k, "")) for k, v in match.groupdict().items()}
    for k, v in defaults.items():
        groups.setdefault(k, v)
    try:
        return sql.format_map(groups)
    except KeyError:
        return sql


class RuleBasedAdapter(Text2SQLAdapter):
    """Template-based Text2SQL adapter.

    Matches the question against ordered regex patterns. First match wins.
    Falls back to NotImplementedError when no template matches.
    """

    @property
    def adapter_name(self) -> str:
        return "rule_based"

    def generate_sql(
        self,
        question: str,
        schema_context: str,
        few_shot_examples: list[FewShotExample],
    ) -> str:
        """Match question to SQL template.

        Args:
            question: Natural language question.
            schema_context: Ignored by this adapter (uses hardcoded schema knowledge).
            few_shot_examples: Ignored by this adapter.

        Returns:
            SQL string from the matched template.

        Raises:
            NotImplementedError: When no template matches.
        """
        for tmpl in _TEMPLATES:
            m = tmpl.pattern.search(question)
            if m:
                sql = _fill_template(tmpl.sql, m, _DEFAULTS)
                return sql.strip()

        raise NotImplementedError(
            f"No template matched for question: {question!r}. "
            "Try LLM_PROVIDER=openai for more complex queries."
        )
