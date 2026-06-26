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
    # ── Chinese language templates (matched first) ────────────────────────────
    Template(
        pattern=re.compile(r"前\s*(?P<n>\d+)\s*名客戶|按消費金額.*客戶|消費.*排名", re.I),
        sql=(
            "SELECT c.customer_id, c.name, "
            "ROUND(SUM(p.amount), 2) AS total_spending "
            "FROM customers c "
            "JOIN orders o ON c.customer_id = o.customer_id "
            "JOIN payments p ON o.order_id = p.order_id "
            "WHERE p.status = 'completed' "
            "GROUP BY c.customer_id, c.name "
            "ORDER BY total_spending DESC "
            "LIMIT {n}"
        ),
        description="前N名客戶按消費金額",
    ),
    Template(
        pattern=re.compile(r"每月.*收入|按月.*收入|月.*總收入|收入.*按月", re.I),
        sql=(
            "SELECT DATE_TRUNC('month', p.paid_at) AS month, "
            "ROUND(SUM(p.amount), 2) AS total_revenue "
            "FROM payments p "
            "WHERE p.status = 'completed' "
            "GROUP BY 1 "
            "ORDER BY 1"
        ),
        description="每月總收入",
    ),
    Template(
        pattern=re.compile(r"按.*品類.*收入|品類.*收入|品類.*分解", re.I),
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
        description="按品類分解收入",
    ),
    Template(
        pattern=re.compile(r"各品類.*評分|平均.*評分.*品類|品類.*平均.*評分|產品評分", re.I),
        sql=(
            "SELECT p.category, "
            "ROUND(AVG(r.score), 2) AS avg_rating, "
            "COUNT(r.review_id) AS review_count "
            "FROM reviews r "
            "JOIN products p ON r.product_id = p.product_id "
            "GROUP BY p.category "
            "ORDER BY avg_rating DESC "
            "LIMIT 20"
        ),
        description="各品類平均評分",
    ),
    Template(
        pattern=re.compile(r"每日.*銷售|日銷售趨勢|日.*銷售.*趨勢|銷售趨勢", re.I),
        sql=(
            "SELECT date, revenue, order_count, avg_order_value, "
            "unique_customers, units_sold, top_category "
            "FROM daily_sales "
            "ORDER BY date DESC "
            "LIMIT 30"
        ),
        description="每日銷售趨勢",
    ),
    Template(
        pattern=re.compile(r"按狀態.*訂單|訂單.*狀態|訂單.*分解|狀態分布", re.I),
        sql=(
            "SELECT status, COUNT(*) AS order_count, "
            "ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS pct_of_total "
            "FROM orders "
            "GROUP BY status "
            "ORDER BY order_count DESC"
        ),
        description="訂單狀態分布",
    ),
    Template(
        pattern=re.compile(r"哪些產品.*收入|產品.*收入最高|收入最高.*產品", re.I),
        sql=(
            "SELECT p.product_id, p.name, p.category, "
            "ROUND(SUM(oi.line_total), 2) AS total_revenue, "
            "SUM(oi.quantity) AS units_sold "
            "FROM products p "
            "JOIN order_items oi ON p.product_id = oi.product_id "
            "JOIN orders o ON oi.order_id = o.order_id "
            "WHERE o.status = 'completed' "
            "GROUP BY p.product_id, p.name, p.category "
            "ORDER BY total_revenue DESC "
            "LIMIT 10"
        ),
        description="產品收入排名",
    ),
    Template(
        pattern=re.compile(r"列出.*客戶|紐約.*客戶|客戶.*在.*市|查詢客戶", re.I),
        sql=(
            "SELECT customer_id, name, city, state, segment, signup_date "
            "FROM customers "
            "ORDER BY customer_id "
            "LIMIT 50"
        ),
        description="列出客戶",
    ),
    Template(
        pattern=re.compile(r"暢銷產品|銷售量.*產品|最暢銷|按銷售量", re.I),
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
            "LIMIT 10"
        ),
        description="暢銷產品排名",
    ),
    Template(
        pattern=re.compile(r"已完成.*訂單|完成.*訂單|今年.*訂單|訂單.*今年", re.I),
        sql=(
            "SELECT o.order_id, c.name AS customer_name, "
            "CAST(o.order_date AS DATE)::VARCHAR AS order_date, "
            "o.total_amount, o.shipping_city "
            "FROM orders o "
            "JOIN customers c ON o.customer_id = c.customer_id "
            "WHERE o.status = 'completed' "
            "AND EXTRACT(year FROM o.order_date) = EXTRACT(year FROM CURRENT_DATE) "
            "ORDER BY o.order_date DESC "
            "LIMIT 50"
        ),
        description="已完成訂單（今年）",
    ),
    # ── English templates ─────────────────────────────────────────────────────
    Template(
        pattern=re.compile(
            r"top\s+(?P<n>\d+)\s+customers?\s+by\s+(?:total\s+)?"
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
            r"(?:best[\s-]selling\s+|top\s+(?P<n2>\d+)\s+)products?\s*"
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
            r"order(?:s)?\s+(?:count\s+)?(?:breakdown\s+)?(?:by\s+)?status|"
            r"order\s+status\s+(?:breakdown|distribution|summary)|"
            r"status\s+(?:of\s+)?orders?",
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
            r"(?:revenue|sales)\s+(?:breakdown\s+)?(?:by|per)\s+(?:product\s+)?category",
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
    # ── Additional templates ──────────────────────────────────────────────────
    Template(
        pattern=re.compile(
            r"(?:revenue|sales|orders?)\s+(?:by|per)\s+(?:shipping\s+)?(?P<geo>state|city)",
            re.I,
        ),
        sql=(
            "SELECT o.shipping_{geo}, "
            "COUNT(DISTINCT o.order_id) AS order_count, "
            "ROUND(SUM(p.amount), 2) AS total_revenue "
            "FROM orders o "
            "JOIN payments p ON o.order_id = p.order_id "
            "WHERE p.status = 'completed' AND o.shipping_{geo} IS NOT NULL "
            "GROUP BY o.shipping_{geo} "
            "ORDER BY total_revenue DESC "
            "LIMIT 20"
        ),
        description="Revenue/orders by shipping state or city",
    ),
    Template(
        pattern=re.compile(
            r"(?:payment\s+)?method(?:s)?\s+(?:breakdown|distribution|split|by\s+type)?|"
            r"(?:revenue|sales)\s+by\s+payment",
            re.I,
        ),
        sql=(
            "SELECT method, "
            "COUNT(*) AS transaction_count, "
            "ROUND(SUM(amount), 2) AS total_revenue, "
            "ROUND(100.0 * SUM(amount) / SUM(SUM(amount)) OVER (), 2) AS pct "
            "FROM payments "
            "WHERE status = 'completed' "
            "GROUP BY method "
            "ORDER BY total_revenue DESC"
        ),
        description="Revenue breakdown by payment method",
    ),
    Template(
        pattern=re.compile(
            r"(?:low\s+stock|out\s+of\s+stock|inventory\s+alert|restock)",
            re.I,
        ),
        sql=(
            "SELECT product_id, name, category, stock_quantity, price "
            "FROM products "
            "WHERE stock_quantity < 50 AND is_active = true "
            "ORDER BY stock_quantity ASC "
            "LIMIT 20"
        ),
        description="Products with low stock (under 50 units)",
    ),
    Template(
        pattern=re.compile(
            r"(?:top\s+(?P<n3>\d+)\s+)?(?:top[\s-])?rated\s+products?|"
            r"highest\s+rated\s+products?|products?\s+by\s+rating",
            re.I,
        ),
        sql=(
            "SELECT p.product_id, p.name, p.category, "
            "ROUND(AVG(r.score), 2) AS avg_rating, "
            "COUNT(r.review_id) AS review_count, "
            "ROUND(SUM(oi.line_total), 2) AS total_revenue "
            "FROM products p "
            "JOIN reviews r ON p.product_id = r.product_id "
            "JOIN order_items oi ON p.product_id = oi.product_id "
            "GROUP BY p.product_id, p.name, p.category "
            "HAVING COUNT(r.review_id) >= 3 "
            "ORDER BY avg_rating DESC, review_count DESC "
            "LIMIT {n3}"
        ),
        description="Top rated products with review count",
    ),
    Template(
        pattern=re.compile(
            r"customer\s+segment(?:s)?(?:\s+breakdown|\s+distribution|\s+analysis)?|"
            r"(?:revenue|orders?)\s+by\s+(?:customer\s+)?segment",
            re.I,
        ),
        sql=(
            "SELECT c.segment, "
            "COUNT(DISTINCT c.customer_id) AS customer_count, "
            "COUNT(DISTINCT o.order_id) AS order_count, "
            "ROUND(SUM(p.amount), 2) AS total_revenue, "
            "ROUND(AVG(p.amount), 2) AS avg_order_value "
            "FROM customers c "
            "JOIN orders o ON c.customer_id = o.customer_id "
            "JOIN payments p ON o.order_id = p.order_id "
            "WHERE p.status = 'completed' "
            "GROUP BY c.segment "
            "ORDER BY total_revenue DESC"
        ),
        description="Revenue and order breakdown by customer segment",
    ),
    Template(
        pattern=re.compile(
            r"new\s+customers?(?:\s+this\s+(?:month|year))?|"
            r"recent\s+sign[\s-]?ups?|customer\s+acquisition",
            re.I,
        ),
        sql=(
            "SELECT DATE_TRUNC('month', signup_date) AS signup_month, "
            "COUNT(*) AS new_customers "
            "FROM customers "
            "WHERE signup_date >= CURRENT_DATE - INTERVAL '6 months' "
            "GROUP BY 1 "
            "ORDER BY 1 DESC"
        ),
        description="New customer signups by month (last 6 months)",
    ),
    Template(
        pattern=re.compile(
            r"repeat\s+customers?|loyal\s+customers?|returning\s+customers?|"
            r"customers?\s+with\s+(?:multiple|more\s+than\s+one)\s+orders?",
            re.I,
        ),
        sql=(
            "SELECT c.customer_id, c.name, c.segment, "
            "COUNT(DISTINCT o.order_id) AS order_count, "
            "ROUND(SUM(p.amount), 2) AS total_spent, "
            "MIN(o.order_date::DATE)::VARCHAR AS first_order, "
            "MAX(o.order_date::DATE)::VARCHAR AS last_order "
            "FROM customers c "
            "JOIN orders o ON c.customer_id = o.customer_id "
            "JOIN payments p ON o.order_id = p.order_id "
            "WHERE p.status = 'completed' "
            "GROUP BY c.customer_id, c.name, c.segment "
            "HAVING COUNT(DISTINCT o.order_id) > 1 "
            "ORDER BY order_count DESC, total_spent DESC "
            "LIMIT 20"
        ),
        description="Repeat customers with multiple orders",
    ),
    Template(
        pattern=re.compile(
            r"revenue\s+(?:this|current)\s+(?P<period2>month|year)|"
            r"(?:this|current)\s+(?P<period3>month|year)(?:'s)?\s+revenue",
            re.I,
        ),
        sql=(
            "SELECT ROUND(SUM(p.amount), 2) AS revenue, "
            "COUNT(DISTINCT p.order_id) AS order_count "
            "FROM payments p "
            "WHERE p.status = 'completed' "
            "AND DATE_TRUNC('{period2}', p.paid_at) = DATE_TRUNC('{period2}', CURRENT_DATE)"
        ),
        description="Revenue for the current month or year",
    ),
    Template(
        pattern=re.compile(
            r"(?P<status>cancelled?|pending|shipped|returned?)\s+orders?|"
            r"orders?\s+(?:with\s+status\s+)?(?P<status2>cancelled?|pending|shipped|returned?)",
            re.I,
        ),
        sql=(
            "SELECT order_id, customer_id, "
            "CAST(order_date AS DATE)::VARCHAR AS order_date, "
            "total_amount, status "
            "FROM orders "
            "WHERE LOWER(status) = '{status}' "
            "ORDER BY order_date DESC "
            "LIMIT 50"
        ),
        description="Orders filtered by status",
    ),
    Template(
        pattern=re.compile(
            r"(?:average|avg)\s+(?:items?|products?)\s+(?:per|in\s+an?)\s+order|"
            r"(?:basket|cart)\s+size",
            re.I,
        ),
        sql=(
            "SELECT ROUND(AVG(item_count), 2) AS avg_items_per_order, "
            "ROUND(AVG(order_total), 2) AS avg_order_total "
            "FROM ("
            "  SELECT oi.order_id, "
            "  SUM(oi.quantity) AS item_count, "
            "  ROUND(SUM(oi.line_total), 2) AS order_total "
            "  FROM order_items oi "
            "  JOIN orders o ON oi.order_id = o.order_id "
            "  WHERE o.status = 'completed' "
            "  GROUP BY oi.order_id"
            ") t"
        ),
        description="Average basket size (items per order)",
    ),
    Template(
        pattern=re.compile(
            r"monthly\s+revenue\s+(?:trend|growth|comparison)|"
            r"revenue\s+(?:trend|growth)\s+(?:by|per)\s+month|"
            r"month[\s-]over[\s-]month",
            re.I,
        ),
        sql=(
            "SELECT DATE_TRUNC('month', p.paid_at)::VARCHAR AS month, "
            "ROUND(SUM(p.amount), 2) AS revenue, "
            "COUNT(DISTINCT p.order_id) AS orders, "
            "ROUND(SUM(p.amount) - LAG(SUM(p.amount)) OVER (ORDER BY DATE_TRUNC('month', p.paid_at)), 2) AS mom_change "
            "FROM payments p "
            "WHERE p.status = 'completed' AND p.paid_at IS NOT NULL "
            "GROUP BY DATE_TRUNC('month', p.paid_at) "
            "ORDER BY month DESC "
            "LIMIT 12"
        ),
        description="Month-over-month revenue trend for last 12 months",
    ),
    Template(
        pattern=re.compile(
            r"(?:show|list|get)\s+(?:all\s+)?products?(?:\s+list)?|"
            r"(?:product|item)\s+(?:catalog|inventory|list)",
            re.I,
        ),
        sql=(
            "SELECT product_id, name, category, subcategory, "
            "price, stock_quantity, is_active "
            "FROM products "
            "WHERE is_active = true "
            "ORDER BY category, name "
            "LIMIT 100"
        ),
        description="List active products from catalog",
    ),
    Template(
        pattern=re.compile(
            r"(?:recent|last|latest)\s+(?P<n4>\d+)?\s*orders?|"
            r"orders?\s+(?:in\s+the\s+)?(?:last|past)\s+(?P<days>\d+)\s+days?",
            re.I,
        ),
        sql=(
            "SELECT o.order_id, c.name AS customer_name, "
            "CAST(o.order_date AS DATE)::VARCHAR AS order_date, "
            "o.status, o.total_amount "
            "FROM orders o "
            "JOIN customers c ON o.customer_id = c.customer_id "
            "ORDER BY o.order_date DESC "
            "LIMIT {n4}"
        ),
        description="Most recent orders",
    ),
    Template(
        pattern=re.compile(
            r"query\s+history|recent\s+queries?|past\s+queries?|"
            r"(?:nl|natural\s+language)\s+(?:query\s+)?history",
            re.I,
        ),
        sql=(
            "SELECT id, CAST(timestamp AS VARCHAR) AS timestamp, "
            "question, is_safe, row_count, execution_time_ms "
            "FROM query_history "
            "ORDER BY id DESC "
            "LIMIT 20"
        ),
        description="Recent NL query history",
    ),
    Template(
        pattern=re.compile(
            r"(?:which|top)\s+products?\s+(?:have\s+)?(?:the\s+)?highest\s+revenue|"
            r"products?\s+(?:by|with)\s+(?:highest|most)\s+revenue|"
            r"most\s+profitable\s+products?",
            re.I,
        ),
        sql=(
            "SELECT p.product_id, p.name, p.category, "
            "ROUND(SUM(oi.line_total), 2) AS total_revenue, "
            "SUM(oi.quantity) AS units_sold "
            "FROM products p "
            "JOIN order_items oi ON p.product_id = oi.product_id "
            "JOIN orders o ON oi.order_id = o.order_id "
            "WHERE o.status = 'completed' "
            "GROUP BY p.product_id, p.name, p.category "
            "ORDER BY total_revenue DESC "
            "LIMIT 10"
        ),
        description="Products ranked by total revenue",
    ),
    Template(
        pattern=re.compile(
            r"(?:show|list|get|display)\s+(?:all\s+)?completed\s+orders?|"
            r"completed\s+orders?\s+(?:this\s+year|in\s+\d{4})?|"
            r"orders?\s+(?:that\s+are\s+)?completed",
            re.I,
        ),
        sql=(
            "SELECT o.order_id, c.name AS customer_name, "
            "CAST(o.order_date AS DATE)::VARCHAR AS order_date, "
            "o.total_amount, o.shipping_city "
            "FROM orders o "
            "JOIN customers c ON o.customer_id = c.customer_id "
            "WHERE o.status = 'completed' "
            "AND EXTRACT(year FROM o.order_date) = EXTRACT(year FROM CURRENT_DATE) "
            "ORDER BY o.order_date DESC "
            "LIMIT 50"
        ),
        description="Completed orders this year",
    ),
    Template(
        pattern=re.compile(
            r"(?:list|show|get)\s+(?:all\s+)?customers?\s+(?:from|in|based\s+in)\s+(?P<city>[A-Za-z\s]+)",
            re.I,
        ),
        sql=(
            "SELECT customer_id, name, city, state, segment, signup_date "
            "FROM customers "
            "WHERE LOWER(city) LIKE LOWER('%{city}%') "
            "ORDER BY name "
            "LIMIT 50"
        ),
        description="Customers from a specific city",
    ),
]

_DEFAULTS: dict[str, str] = {
    "n": "10",
    "n2": "10",
    "n3": "10",
    "n4": "20",
    "days": "30",
    "metric": "revenue",
    "metric2": "revenue",
    "period": "month",
    "period2": "month",
    "period3": "month",
    "dimension": "category",
    "geo": "state",
    "status": "pending",
    "status2": "",
}


def _fill_template(sql: str, match: re.Match, defaults: dict[str, str]) -> str:
    """Fill named capture groups into SQL template, applying defaults.

    Groups named with a numeric suffix (e.g. status2, period3) are coalesced
    into their base name (status, period) when the base group is unset.
    This lets alternation branches carry distinct names despite Python re not
    supporting duplicate group names in a single pattern.
    """
    raw = match.groupdict()  # {name: value|None}

    # Coalesce suffixed alternates BEFORE applying defaults:
    # if 'status2' matched but 'status' did not, treat status = status2
    for key, val in list(raw.items()):
        base = key.rstrip("0123456789")
        if base != key and val and not raw.get(base):
            raw[base] = val

    # Apply defaults for any group that is still None/empty
    groups: dict[str, str] = {k: (v or defaults.get(k, "")) for k, v in raw.items()}
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
        conversation_history: list[dict] | None = None,
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
            "此查詢未能匹配預設模板，請嘗試更明確的關鍵字，或點擊右側「範例查詢」。"
            " (Try keywords like: 'top customers', 'revenue by month', 'order status', 'daily sales')"
        )
